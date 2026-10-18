import { calculateRoute, calculateHaversineDistanceKm } from './routing-adapter';
import { calculateTravelCost } from './cost-calculator';
import { travelTelemetry } from './telemetry';
import {
  CandidateProvider,
  ClinicalRiskContext,
  DestinationComparisonOption,
  PatientTravelContext,
  RecommendationCategory,
  TravelComparisonServiceRequest,
  TravelComparisonResult,
} from './types';
import {
  SAVED_COMPARISONS,
  SEEDED_PATIENTS,
  SEEDED_PROVIDERS,
  SEEDED_RISK_CONTEXTS,
} from './data-store';

/**
 * Executes a safety-first travel comparison for post-surgical follow-up.
 */
export async function executeTravelComparison(
  req: TravelComparisonServiceRequest
): Promise<TravelComparisonResult> {
  const startTime = Date.now();
  const effectiveOrigin = req.origin || { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur, Rajasthan' };
  req.origin = effectiveOrigin;
  const comparisonId = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  // 1. Resolve Patient Context (Contract with Member 1)
  const patient: PatientTravelContext =
    SEEDED_PATIENTS.find((p) => p.patientId === req.patientId) ?? {
      patientId: req.patientId,
      name: 'Demonstration Patient',
      surgeryType: 'Post-Surgical General Recovery',
      daysPostOp: 14,
      primaryHospitalId: 'hp-apex-delhi',
      primaryHospitalName: 'Apex National Heart Institute',
      origin: req.origin,
    };

  // 2. Resolve Clinical Risk & Escalation State (Contract with Member 2)
  const existingRisk = SEEDED_RISK_CONTEXTS[req.patientId];
  let clinicalRisk: ClinicalRiskContext;

  if (existingRisk) {
    // Check if assessment is stale (older than 48 hours)
    const ageHours = (Date.now() - new Date(existingRisk.assessmentTimestamp || '').getTime()) / 3600000;
    const isStale = isNaN(ageHours) || ageHours > 48;
    clinicalRisk = {
      ...existingRisk,
      isStale,
      isMissing: false,
    };
  } else {
    // MANDATORY SAFETY RULE: Missing risk data is NEVER interpreted as low risk!
    clinicalRisk = {
      urgencyLevel: 'UNASSESSED_OR_MISSING',
      isEscalated: false,
      redFlags: [],
      clinicianReviewed: false,
      isMissing: true,
      isStale: false,
      notes:
        'Safety Alert: No validated clinical risk assessment on file. Recovery trajectory must be reviewed by a clinician before non-local or remote follow-up is cleared.',
    };
  }

  // Allow simulation of risk level if specified in request
  if (req.simulateClinicalUrgency) {
    if (req.simulateClinicalUrgency === 'UNASSESSED_OR_MISSING') {
      clinicalRisk = {
        urgencyLevel: 'UNASSESSED_OR_MISSING',
        isEscalated: false,
        redFlags: [],
        clinicianReviewed: false,
        isMissing: true,
        isStale: false,
        notes: 'Simulated missing/unassessed risk state for safety verification.',
      };
    } else {
      const isUrgent = req.simulateClinicalUrgency === 'CRITICAL' || req.simulateClinicalUrgency === 'HIGH';
      clinicalRisk = {
        ...clinicalRisk,
        urgencyLevel: req.simulateClinicalUrgency,
        isEscalated: isUrgent,
        isMissing: false,
        redFlags: isUrgent
          ? [
              'Simulated critical acute post-operative complication',
              'Surgical wound erythema spreading > 5 cm with purulent discharge',
            ]
          : [],
        notes: `Assessment state simulated as ${req.simulateClinicalUrgency} for safety validation.`,
      };
    }
  }

  // 3. Clinical Safety Gate: Check for Urgent Escalation Override
  const isEmergencyEscalated =
    clinicalRisk.isEscalated ||
    clinicalRisk.urgencyLevel === 'CRITICAL' ||
    clinicalRisk.redFlags.length > 0 && clinicalRisk.urgencyLevel === 'HIGH';

  if (isEmergencyEscalated) {
    // Locate nearest emergency facility (SMS hospital or closest 24/7 ER)
    const emergencyProvider =
      SEEDED_PROVIDERS.find((p) => p.supportedServices.includes('EMERGENCY_SURGICAL_CARE')) ??
      SEEDED_PROVIDERS[0];

    const emergencyRoute = await calculateRoute(
      req.origin,
      emergencyProvider.location,
      req.transportMode
    );

    const escalationResult: TravelComparisonResult = {
      comparisonId,
      patientId: patient.patientId,
      patientName: patient.name,
      surgeryType: patient.surgeryType,
      createdAt,
      origin: req.origin,
      requiredService: req.requiredService,
      transportMode: req.transportMode,
      clinicalRisk,
      isEscalated: true,
      escalationReason:
        'Urgent clinical red flags identified. Ordinary travel comparison is suspended to avoid delaying critical medical care.',
      emergencyActionRequired:
        'Instruct patient or caregiver to report immediately to the nearest 24/7 emergency facility or contact the primary surgical team.',
      recommendedCategory: 'EMERGENCY_ESCALATION',
      recommendedProviderId: emergencyProvider.providerId,
      recommendationRationale: `EMERGENCY ESCALATION ACTIVE: Red-flag symptoms (${clinicalRisk.redFlags.join(
        '; '
      )}) preclude routine travel or local clinic substitution. Direct triage to ${emergencyProvider.name} (${emergencyRoute.distanceKm} km away) is mandatory.`,
      candidates: [
        {
          providerId: emergencyProvider.providerId,
          providerName: emergencyProvider.name,
          isOriginalHospital: emergencyProvider.providerId === patient.primaryHospitalId,
          location: emergencyProvider.location,
          isVerified: true,
          verificationBadge: 'STATE_HEALTH_AUTHORITY',
          isEligible: true,
          matchedServices: ['EMERGENCY_SURGICAL_CARE'],
          route: emergencyRoute,
          costEstimate: null,
          costMissingReason: 'Cost estimation disabled during clinical emergency escalation.',
          rankOrder: 1,
          isRecommended: true,
          scoreBreakdown: {
            clinicalCapabilityScore: 100,
            travelBurdenScore: 100,
            verificationScore: 100,
          },
        },
      ],
      status: 'ESCALATED',
      meta: {
        routingServiceStatus: emergencyRoute.routeSource,
        notice:
          'Medical Priority Override: Patient safety takes absolute precedence over travel cost or convenience.',
      },
    };

    // Record operational telemetry (ZERO PHI)
    travelTelemetry.recordComparison({
      isEscalated: true,
      processingDurationMs: Date.now() - startTime,
    });
    if (
      emergencyRoute.routeSource === 'OSRM_LIVE' ||
      emergencyRoute.routeSource === 'OSRM_CACHED' ||
      emergencyRoute.routeSource === 'ESTIMATED_HAVERSINE_ROAD_FACTOR'
    ) {
      travelTelemetry.recordRouteSource(emergencyRoute.routeSource);
    }

    SAVED_COMPARISONS.set(comparisonId, escalationResult);
    return escalationResult;
  }

  // 4. Resolve Candidate Providers (Contract with Member 3)
  // Retrieve original hospital plus candidate local providers within radius or district
  const resolvedDistrict = req.origin?.district || patient?.origin?.district || '';
  const candidateProviders: CandidateProvider[] = SEEDED_PROVIDERS.filter((p) => {
    if (req.customCandidateIds && req.customCandidateIds.length > 0) {
      return req.customCandidateIds.includes(p.providerId);
    }
    // Always include primary surgical hospital
    if (p.providerId === patient.primaryHospitalId) return true;

    // Match by district if present
    if (resolvedDistrict && p.location.district && p.location.district.toLowerCase() === resolvedDistrict.toLowerCase()) {
      return true;
    }

    // Match by proximity: within 150 km straight-line distance
    const dist = calculateHaversineDistanceKm(
      req.origin.latitude,
      req.origin.longitude,
      p.location.latitude,
      p.location.longitude
    );
    return dist <= 150;
  });

  // 5. Evaluate and Score Candidates
  const evaluatedOptions: DestinationComparisonOption[] = [];

  for (const provider of candidateProviders) {
    const isOriginalHospital = provider.providerId === patient.primaryHospitalId;
    
    // Hard Eligibility Gate: Must offer required post-op service
    const offersService = provider.supportedServices.includes(req.requiredService);
    let isEligible = offersService;
    let ineligibilityReason: string | undefined;

    if (!offersService) {
      isEligible = false;
      ineligibilityReason = `Facility does not offer requested service: ${req.requiredService.replace(/_/g, ' ')}.`;
    }

    // Routing calculation
    const route = await calculateRoute(req.origin, provider.location, req.transportMode);

    // Cost calculation (independent, transparent)
    const { estimate, missingReason } = calculateTravelCost({
      oneWayDistanceKm: route.distanceKm,
      durationMins: route.durationMins,
      mode: req.transportMode,
      currency: 'INR',
    });

    // Scoring Breakdown (0 to 100)
    const clinicalCapabilityScore = isOriginalHospital ? 100 : offersService ? 85 : 0;
    const verificationScore = provider.isVerified ? 90 : 40;
    // Lower distance gives higher score (100 at 0km, down to 0 at 500km)
    const travelBurdenScore = Math.max(0, Math.round(100 - (route.distanceKm / 500) * 100));

    evaluatedOptions.push({
      providerId: provider.providerId,
      providerName: provider.name,
      isOriginalHospital,
      location: provider.location,
      isVerified: provider.isVerified,
      verificationBadge: provider.verificationBadge,
      isEligible,
      ineligibilityReason,
      matchedServices: provider.supportedServices.filter((s) => s === req.requiredService),
      route,
      costEstimate: estimate,
      costMissingReason: missingReason,
      rankOrder: 0, // Assigned below
      isRecommended: false,
      scoreBreakdown: {
        clinicalCapabilityScore,
        travelBurdenScore,
        verificationScore,
      },
    });
  }

  // 6. Multi-Criteria Ranking (Eligible options first, sorted by composite score)
  const eligible = evaluatedOptions.filter((o) => o.isEligible);
  const ineligible = evaluatedOptions.filter((o) => !o.isEligible);

  // Sorting eligible: high verification & low travel burden
  eligible.sort((a, b) => {
    // Composite: 40% travel burden reduction, 35% capability, 25% verification
    const scoreA =
      a.scoreBreakdown.travelBurdenScore * 0.4 +
      a.scoreBreakdown.clinicalCapabilityScore * 0.35 +
      a.scoreBreakdown.verificationScore * 0.25;
    const scoreB =
      b.scoreBreakdown.travelBurdenScore * 0.4 +
      b.scoreBreakdown.clinicalCapabilityScore * 0.35 +
      b.scoreBreakdown.verificationScore * 0.25;
    return scoreB - scoreA;
  });

  const rankedCandidates = [...eligible, ...ineligible].map((candidate, idx) => ({
    ...candidate,
    rankOrder: idx + 1,
    isRecommended: idx === 0 && candidate.isEligible,
  }));

  const recommended = rankedCandidates.find((c) => c.isRecommended);
  const originalHospitalOption = rankedCandidates.find((c) => c.isOriginalHospital);

  // Calculate potential travel savings compared to original hospital
  let potentialTravelSavingsKm: number | undefined;
  let potentialDurationSavingsMins: number | undefined;
  let recommendedCategory: RecommendationCategory = 'LOCAL_VERIFIED_CLINIC';
  let recommendationRationale = '';

  if (clinicalRisk.isMissing || clinicalRisk.urgencyLevel === 'UNASSESSED_OR_MISSING') {
    recommendationRationale = `CLINICAL CLEARANCE REQUIRED: Risk assessment data is unavailable. Distance and cost comparisons are displayed for informational coordination only, but patient must be evaluated by a medical clinician before travel is cleared.`;
  } else if (recommended && originalHospitalOption && recommended.providerId !== originalHospitalOption.providerId) {
    const roundtripOriginal = originalHospitalOption.route.distanceKm * 2;
    const roundtripLocal = recommended.route.distanceKm * 2;
    potentialTravelSavingsKm = Math.max(0, Math.round((roundtripOriginal - roundtripLocal) * 10) / 10);
    potentialDurationSavingsMins = Math.max(
      0,
      (originalHospitalOption.route.durationMins - recommended.route.durationMins) * 2
    );

    recommendedCategory = 'LOCAL_VERIFIED_CLINIC';
    recommendationRationale = `Clinically approved local care: Attending ${recommended.providerName} eliminates an estimated ${potentialTravelSavingsKm} km of round-trip travel (${Math.round(potentialDurationSavingsMins / 60)} hrs travel time saved) while fulfilling required post-surgical care (${req.requiredService.replace(/_/g, ' ')}).`;
    if (clinicalRisk.isStale) {
      recommendationRationale += ' [Notice: Assessment record is >48h old and may be stale.]';
    }
  } else if (recommended && recommended.isOriginalHospital) {
    recommendedCategory = 'ORIGINAL_SURGICAL_HOSPITAL';
    recommendationRationale = `Return to ${recommended.providerName} recommended. Nearby local clinics lack the necessary specialized post-surgical capabilities for ${req.requiredService.replace(/_/g, ' ')}.`;
  } else {
    recommendedCategory = 'TELECONSULTATION_HYBRID';
    recommendationRationale = 'No local in-person facility meets the clinical criteria. A teleconsultation with remote assessment is recommended to determine next steps.';
  }

  const result: TravelComparisonResult = {
    comparisonId,
    patientId: patient.patientId,
    patientName: patient.name,
    surgeryType: patient.surgeryType,
    createdAt,
    origin: req.origin,
    requiredService: req.requiredService,
    transportMode: req.transportMode,
    clinicalRisk,
    isEscalated: false,
    recommendedCategory,
    recommendedProviderId: recommended?.providerId,
    recommendationRationale,
    potentialTravelSavingsKm,
    potentialDurationSavingsMins,
    candidates: rankedCandidates,
    status: 'COMPLETED',
    meta: {
      routingServiceStatus: rankedCandidates[0]?.route.routeSource ?? 'UNAVAILABLE',
      notice:
        'Informational decision support only. Travel estimates do not constitute medical travel clearance. Clinician review required.',
    },
  };

  // Record operational telemetry (ZERO PHI)
  travelTelemetry.recordComparison({
    isEscalated: false,
    distanceSavedKm: potentialTravelSavingsKm,
    durationSavedMins: potentialDurationSavingsMins,
    processingDurationMs: Date.now() - startTime,
  });

  for (const cand of rankedCandidates) {
    if (
      cand.route.routeSource === 'OSRM_LIVE' ||
      cand.route.routeSource === 'OSRM_CACHED' ||
      cand.route.routeSource === 'ESTIMATED_HAVERSINE_ROAD_FACTOR'
    ) {
      travelTelemetry.recordRouteSource(cand.route.routeSource);
    }
  }

  SAVED_COMPARISONS.set(comparisonId, result);
  return result;
}
