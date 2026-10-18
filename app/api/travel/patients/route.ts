import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated } from '@/lib/server/db-access';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(request);
    requireAuthenticated(auth);
    let patientIds: string[] | undefined;
    if (auth.role === 'PATIENT') {
      const own = await prisma.patient.findUnique({ where: { userId: auth.userId }, select: { id: true } });
      if (!own) throw new AccessError('Patient profile was not found.', 404);
      patientIds = [own.id];
    } else if (auth.role === 'CLINICIAN') {
      const [plans, reviews] = await Promise.all([
        prisma.followUpPlan.findMany({ where: { approvedByClinicianId: auth.userId }, select: { patientId: true }, distinct: ['patientId'] }),
        prisma.clinicianReview.findMany({ where: { reviewerId: auth.userId }, select: { assessment: { select: { patientId: true } } } }),
      ]);
      patientIds = [...new Set([...plans.map((p) => p.patientId), ...reviews.map((r) => r.assessment.patientId)])];
    }

    const patients = await prisma.patient.findMany({
      where: patientIds ? { id: { in: patientIds } } : {},
      include: {
        surgeries: { orderBy: { surgeryDate: 'desc' }, take: 1 },
        riskAssessments: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, riskLevel: true, overrideLevel: true, isEscalated: true, reviewStatus: true, reviewedAt: true, createdAt: true } },
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });

    const options = await Promise.all(patients.map(async (patient) => {
      const surgery = patient.surgeries[0];
      const assessment = patient.riskAssessments[0];
      const finalRisk = assessment?.overrideLevel || assessment?.riskLevel;
      const isReviewed = Boolean(assessment?.reviewedAt && ['ACCEPTED', 'OVERRIDDEN'].includes(assessment.reviewStatus));
      const isStale = !assessment || !assessment.reviewedAt || Date.now() - assessment.reviewedAt.getTime() > 48 * 60 * 60 * 1000;
      const urgency = isReviewed && !isStale && ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(finalRisk || '')
        ? finalRisk
        : 'UNASSESSED_OR_MISSING';
      return {
        patientId: patient.id,
        name: patient.fullName,
        surgeryType: surgery?.procedureName || 'Procedure not recorded',
        daysPostOp: surgery ? Math.max(0, Math.floor((Date.now() - surgery.surgeryDate.getTime()) / 86_400_000)) : 0,
        origin: { label: [patient.homeCity, patient.homeState].filter(Boolean).join(', ') || 'Home location unavailable' },
        clinicalRisk: {
          assessmentId: assessment?.id,
          urgencyLevel: urgency,
          isEscalated: Boolean(assessment?.isEscalated || ['HIGH', 'CRITICAL'].includes(finalRisk || '')),
          clinicianReviewed: isReviewed,
          isStale,
        },
      };
    }));

    return NextResponse.json({
      success: true,
      data: {
        patients: options,
        supportedServices: [
          { code: 'POST_OP_WOUND_CARE', label: 'Surgical Wound Care' },
          { code: 'SUTURE_REMOVAL', label: 'Suture / Staple Removal' },
          { code: 'DRAIN_REMOVAL', label: 'Drain Management' },
          { code: 'DOPPLER_ULTRASOUND', label: 'Doppler Ultrasound' },
          { code: 'CARDIAC_REHAB', label: 'Cardiac Rehabilitation' },
        ],
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[travel/patients] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'PATIENT_CONTEXT_UNAVAILABLE', message: 'Travel patient context could not be loaded.' } }, { status: 503 });
  }
}
