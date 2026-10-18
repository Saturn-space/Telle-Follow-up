import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ServiceCategory } from '@/generated/prisma';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess } from '@/lib/server/db-access';
import { forwardGeocodeAddress } from '@/lib/services/geocoding-service';
import { calculateTravelCost } from '@/lib/travel/cost-calculator';
import { calculateHaversineDistanceKm, calculateRoute } from '@/lib/travel/routing-adapter';
import { TravelComparisonRequestSchema, type CandidateProvider, type ClinicalRiskContext, type DestinationComparisonOption, type GeoLocation, type RecommendationCategory, type TravelComparisonResult } from '@/lib/travel/types';

export const runtime = 'nodejs';

const serviceMap: Record<string, ServiceCategory> = {
  POST_OP_WOUND_CARE: ServiceCategory.WOUND_CARE,
  SUTURE_REMOVAL: ServiceCategory.SUTURE_REMOVAL,
  DRAIN_REMOVAL: ServiceCategory.DRAIN_MANAGEMENT,
  DOPPLER_ULTRASOUND: ServiceCategory.DOPPLER_ULTRASOUND,
  CARDIAC_REHAB: ServiceCategory.CARDIAC_REHAB,
};

function errorResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
  }
  return null;
}

function badgeFor(source: string) {
  if (source === 'OFFICIAL_REGISTRY') return 'STATE_HEALTH_AUTHORITY';
  if (source === 'PARTNER_HEALTH_SYSTEM') return 'HOSPITAL_AFFILIATE';
  if (source === 'COMMUNITY_SUBMISSION') return 'COMMUNITY_PARTNER';
  return 'UNVERIFIED';
}

function asGeo(facility: { latitude: number | null; longitude: number | null; name: string; city: string; state: string }): GeoLocation {
  return { latitude: facility.latitude!, longitude: facility.longitude!, label: `${facility.name}, ${facility.city}, ${facility.state}`, district: facility.city, state: facility.state };
}

function mapProvider(facility: {
  id: string; name: string; facilityType: string; latitude: number | null; longitude: number | null;
  city: string; state: string; dataSource: string; phone: string | null; operatingHours: unknown;
  services: Array<{ serviceCategory: string }>;
}): CandidateProvider {
  return {
    providerId: facility.id,
    name: facility.name,
    facilityType: facility.facilityType === 'HOSPITAL' ? 'HOSPITAL' : facility.facilityType === 'WOUND_CARE_CENTER' ? 'WOUND_CARE_CLINIC' : 'SURGICAL_CLINIC',
    location: asGeo(facility),
    isVerified: true,
    verificationBadge: badgeFor(facility.dataSource) as CandidateProvider['verificationBadge'],
    supportedServices: facility.services.map((service) => service.serviceCategory),
    contactPhone: facility.phone || '',
    operatingHours: typeof facility.operatingHours === 'string' ? facility.operatingHours : 'Contact the facility to confirm hours.',
  };
}

function riskContext(assessment: {
  id: string; riskLevel: string; overrideLevel: string | null; isEscalated: boolean; reviewStatus: string;
  reviewedAt: Date | null; createdAt: Date; escalationReason: string | null;
  clinicalAlerts: Array<{ severity: string; headline: string }>;
}): ClinicalRiskContext {
  const level = assessment.overrideLevel || assessment.riskLevel;
  const redFlags = assessment.clinicalAlerts
    .filter((alert) => ['HIGH', 'CRITICAL'].includes(alert.severity.toUpperCase()))
    .map((alert) => alert.headline);
  return {
    assessmentId: assessment.id,
    urgencyLevel: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(level) ? level as ClinicalRiskContext['urgencyLevel'] : 'UNASSESSED_OR_MISSING',
    isEscalated: assessment.isEscalated || ['HIGH', 'CRITICAL'].includes(level),
    redFlags,
    assessmentTimestamp: assessment.reviewedAt?.toISOString() || assessment.createdAt.toISOString(),
    clinicianReviewed: ['ACCEPTED', 'OVERRIDDEN'].includes(assessment.reviewStatus) && Boolean(assessment.reviewedAt),
    isMissing: false,
    isStale: Date.now() - (assessment.reviewedAt?.getTime() || 0) > 48 * 60 * 60 * 1000,
    notes: assessment.escalationReason || undefined,
  };
}

function scoreOption(option: DestinationComparisonOption) {
  return option.scoreBreakdown.travelBurdenScore * 0.4 + option.scoreBreakdown.clinicalCapabilityScore * 0.35 + option.scoreBreakdown.verificationScore * 0.25;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(request);
    const parsed = TravelComparisonRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Travel comparison parameters are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    const input = parsed.data;
    const patient = await requirePatientAccess(auth, input.patientId);

    const patientRecord = await prisma.patient.findUnique({
      where: { id: patient.id },
      include: { surgeries: { orderBy: { surgeryDate: 'desc' }, take: 1 } },
    });
    if (!patientRecord) throw new AccessError('Patient record was not found.', 404);
    if (!patientRecord.homeCity?.trim()) {
      return NextResponse.json({ success: false, error: { code: 'TRAVEL_ORIGIN_UNAVAILABLE', message: 'A home city is required in the patient record before travel estimates can be calculated.' } }, { status: 409 });
    }
    const originQuery = [patientRecord.homeCity, patientRecord.homeState, 'India'].filter(Boolean).join(', ');
    const geocoded = await forwardGeocodeAddress(originQuery);
    if (!geocoded) return NextResponse.json({ success: false, error: { code: 'TRAVEL_ORIGIN_UNAVAILABLE', message: 'The patient home region could not be geocoded. Add coordinates through an approved location workflow before comparing travel.' } }, { status: 409 });
    const origin: GeoLocation = { latitude: geocoded.latitude, longitude: geocoded.longitude, label: geocoded.displayName, district: patientRecord.homeCity, state: patientRecord.homeState || undefined };

    const latest = await prisma.riskAssessment.findFirst({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: { clinicalAlerts: { select: { severity: true, headline: true } } },
    });
    if (!latest || !['ACCEPTED', 'OVERRIDDEN'].includes(latest.reviewStatus) || !latest.reviewedAt) {
      return NextResponse.json({ success: false, error: { code: 'CLINICAL_REVIEW_REQUIRED', message: 'A clinician must review the latest saved recovery assessment before travel comparison is available.' } }, { status: 409 });
    }
    const risk = riskContext(latest);
    if (risk.isStale) return NextResponse.json({ success: false, error: { code: 'CLINICAL_REVIEW_STALE', message: 'The latest clinician review is more than 48 hours old. Submit a current recovery assessment and obtain a new review.' } }, { status: 409 });

    const requiredCategory = serviceMap[input.requiredService];
    if (!requiredCategory) return NextResponse.json({ success: false, error: { code: 'UNSUPPORTED_SERVICE', message: 'The requested service is not supported for travel comparison.' } }, { status: 400 });
    const isEscalated = risk.isEscalated || risk.urgencyLevel === 'CRITICAL' || (risk.urgencyLevel === 'HIGH' && risk.redFlags.length > 0);

    const facilities = await prisma.healthcareFacility.findMany({
      where: {
        isActive: true,
        verificationStatus: 'VERIFIED',
        latitude: { not: null }, longitude: { not: null },
        ...(isEscalated ? { emergencyCapable: true } : { services: { some: { serviceCategory: requiredCategory } } }),
      },
      include: { services: { select: { serviceCategory: true, specialtyName: true } } },
      take: 100,
    });
    if (facilities.length === 0) {
      return NextResponse.json({ success: false, error: { code: isEscalated ? 'EMERGENCY_FACILITY_UNAVAILABLE' : 'VERIFIED_PROVIDER_UNAVAILABLE', message: isEscalated ? 'No verified emergency-capable facility with coordinates is available. Contact local emergency services or the operating surgical team now.' : 'No verified, service-matched facility with coordinates is available in the directory.' } }, { status: 409 });
    }

    const patientName = patientRecord.fullName;
    const surgery = patientRecord.surgeries[0];
    const surgeryType = surgery?.procedureName || 'Procedure not recorded';
    const daysPostOp = surgery ? Math.max(0, Math.floor((Date.now() - surgery.surgeryDate.getTime()) / 86_400_000)) : 0;
    const providers = facilities.map(mapProvider).sort((a, b) => calculateHaversineDistanceKm(origin.latitude, origin.longitude, a.location.latitude, a.location.longitude) - calculateHaversineDistanceKm(origin.latitude, origin.longitude, b.location.latitude, b.location.longitude)).slice(0, isEscalated ? 1 : 12);
    const originalName = (surgery?.operatingHospital || patientRecord.originalHospital || '').toLowerCase();
    const candidates: DestinationComparisonOption[] = [];

    for (const provider of providers) {
      const isOriginalHospital = Boolean(originalName && (provider.name.toLowerCase().includes(originalName) || originalName.includes(provider.name.toLowerCase())));
      const matchedServices = provider.supportedServices.filter((service) => isEscalated ? service === 'EMERGENCY_SURGICAL_CARE' : service === requiredCategory);
      const route = await calculateRoute(origin, provider.location, input.transportMode);
      const cost = isEscalated ? { estimate: null, missingReason: 'Cost estimation is suppressed during emergency escalation.' } : calculateTravelCost({ oneWayDistanceKm: route.distanceKm, durationMins: route.durationMins, mode: input.transportMode, currency: 'INR' });
      const eligible = isEscalated || matchedServices.length > 0;
      candidates.push({
        providerId: provider.providerId,
        providerName: provider.name,
        isOriginalHospital,
        location: provider.location,
        isVerified: true,
        verificationBadge: provider.verificationBadge,
        isEligible: eligible,
        ineligibilityReason: eligible ? undefined : `Facility does not list ${input.requiredService.replace(/_/g, ' ')}.`,
        matchedServices,
        route,
        costEstimate: cost.estimate,
        costMissingReason: cost.missingReason,
        rankOrder: 0,
        isRecommended: false,
        scoreBreakdown: {
          clinicalCapabilityScore: isEscalated ? 100 : (isOriginalHospital ? 100 : 85),
          travelBurdenScore: Math.max(0, Math.round(100 - route.distanceKm / 5)),
          verificationScore: 100,
        },
      });
    }
    candidates.sort((a, b) => Number(b.isEligible) - Number(a.isEligible) || scoreOption(b) - scoreOption(a));
    candidates.forEach((candidate, index) => { candidate.rankOrder = index + 1; candidate.isRecommended = index === 0 && candidate.isEligible; });

    const recommended = candidates.find((candidate) => candidate.isRecommended);
    const original = candidates.find((candidate) => candidate.isOriginalHospital);
    const category: RecommendationCategory = isEscalated
      ? 'EMERGENCY_ESCALATION'
      : recommended?.isOriginalHospital ? 'ORIGINAL_SURGICAL_HOSPITAL'
        : recommended ? 'LOCAL_VERIFIED_CLINIC' : 'TELECONSULTATION_HYBRID';
    const rationale = isEscalated
      ? `Emergency override: the latest clinician-reviewed assessment is ${risk.urgencyLevel.toLowerCase()}. Routine travel comparison is suspended; seek immediate in-person emergency assessment at ${recommended?.providerName}.`
      : recommended
        ? `Nearest verified directory facility listing ${input.requiredService.replace(/_/g, ' ')} is ${recommended.providerName}. This is a coordination estimate; confirm suitability and appointment details with the care team and facility.`
        : 'No verified facility matching this service is available. Contact the operating surgical team to arrange next steps.';
    const originalDistance = original?.route.distanceKm;
    const savings = !isEscalated && originalDistance !== undefined && recommended && recommended.providerId !== original?.providerId
      ? Math.max(0, Math.round((originalDistance - recommended.route.distanceKm) * 20) / 10)
      : undefined;
    const result: TravelComparisonResult = {
      comparisonId: '', patientId: patient.id, patientName, surgeryType, createdAt: new Date().toISOString(), origin,
      requiredService: input.requiredService, transportMode: input.transportMode, clinicalRisk: risk,
      isEscalated, escalationReason: isEscalated ? risk.notes || 'Elevated risk on clinician-reviewed assessment.' : undefined,
      emergencyActionRequired: isEscalated ? 'Contact local emergency services or proceed to emergency care immediately. Do not delay to arrange routine follow-up.' : undefined,
      recommendedCategory: category, recommendedProviderId: recommended?.providerId, recommendationRationale: rationale,
      potentialTravelSavingsKm: savings,
      potentialDurationSavingsMins: savings !== undefined && original && recommended ? Math.max(0, (original.route.durationMins - recommended.route.durationMins) * 2) : undefined,
      candidates, status: isEscalated ? 'ESCALATED' : 'COMPLETED',
      meta: { routingServiceStatus: recommended?.route.routeSource || 'UNAVAILABLE', notice: geocoded.isApproximate ? 'Origin is an approximate city-level geocode. Route, time and cost are estimates, not medical clearance or appointment confirmation.' : 'Route, time and cost are estimates, not medical clearance or appointment confirmation.' },
    };

    const selected = recommended || candidates[0];
    const estimatedCost = isEscalated ? 0 : selected?.costEstimate?.estimatedCost || 0;
    const saved = await prisma.$transaction(async (tx) => {
      const comparison = await tx.travelComparison.create({
        data: {
          patientId: patient.id,
          riskAssessmentId: latest.id,
          recommendedFacilityId: selected?.providerId,
          originCity: patientRecord.homeCity || '',
          destinationHospital: selected?.providerName || patientRecord.originalHospital || 'No facility selected',
          roundTripDistanceKm: selected ? Math.round(selected.route.distanceKm * 20) / 10 : 0,
          estimatedTravelHours: selected ? Math.round(selected.route.durationMins * 2 / 60 * 100) / 100 : 0,
          estimatedCostInr: estimatedCost,
          recommendedOption: category,
          recommendationRationale: rationale,
          routeSource: selected?.route.routeSource || 'UNAVAILABLE',
          transportMode: input.transportMode,
          candidateOptionsJson: JSON.parse(JSON.stringify({ ...result, comparisonId: '' })) as Prisma.InputJsonValue,
          originCoordinatesJson: { latitude: origin.latitude, longitude: origin.longitude, isApproximate: geocoded.isApproximate },
          isEscalated,
        },
      });
      await tx.auditLog.create({ data: { userId: auth.userId, userEmail: auth.email, userRole: auth.role, action: 'TRAVEL_COMPARISON', entityType: 'TRAVEL_COMPARISON', entityId: comparison.id } });
      return comparison;
    });
    result.comparisonId = saved.id;
    return NextResponse.json({ success: true, data: result, error: null, meta: { timestamp: result.createdAt } }, { status: 201 });
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    console.error('[travel/compare] Comparison failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'TRAVEL_COMPARISON_UNAVAILABLE', message: 'Travel comparison could not be completed. Check database, patient location, and routing configuration.' } }, { status: 503 });
  }
}
