import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated, requirePatientAccess, mapPatient } from '@/lib/server/db-access';
import { mapRiskAssessment } from '@/lib/server/risk-persistence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireAuthenticated(context);
    const params = new URL(request.url).searchParams;
    let patientId = params.get('patientId') || undefined;
    if (context.role === 'PATIENT') {
      const self = await prisma.patient.findUnique({ where: { userId: context.userId }, select: { id: true } });
      if (!self || (patientId && patientId !== self.id)) throw new AccessError('Patients may access only their own records.', 403);
      patientId = self.id;
    }
    if (!patientId) return NextResponse.json({ success: false, error: { code: 'PATIENT_REQUIRED', message: 'Select an authorized patient record.' } }, { status: 400 });
    await requirePatientAccess(context, patientId);

    const activePatient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        surgeries: { orderBy: { surgeryDate: 'desc' }, take: 1 },
        riskAssessments: { orderBy: { createdAt: 'desc' }, take: 1, include: { contributingFactors: true, clinicalAlerts: true, reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } } },
        travelComparisons: { orderBy: { createdAt: 'desc' }, take: 1 },
        followUpPlans: {
          where: context.role === 'CLINICIAN' ? { approvedByClinicianId: context.userId } : undefined,
          orderBy: { createdAt: 'desc' },
          include: {
            appointments: {
              include: {
                facility: true,
                ...(context.role === 'PATIENT' || context.role === 'CLINICIAN' ? { teleSession: true } : {}),
                outcomeRecord: true,
              },
            },
          },
        },
        recoveryLogs: { orderBy: { logTimestamp: 'desc' }, take: 10 },
      },
    });
    if (!activePatient) throw new AccessError('Patient record was not found.', 404);

    const patientWhere = context.role === 'PATIENT'
      ? { userId: context.userId }
      : context.role === 'CLINICIAN'
        ? { OR: [
            { followUpPlans: { some: { approvedByClinicianId: context.userId } } },
            { riskAssessments: { some: { reviews: { some: { reviewerId: context.userId } } } } },
          ] }
        : {};
    const allPatientsRaw = await prisma.patient.findMany({ where: patientWhere, include: { surgeries: { orderBy: { surgeryDate: 'desc' }, take: 1 } }, orderBy: { fullName: 'asc' }, take: 100 });
    const localProviders = activePatient.homeCity
      ? await prisma.healthcareFacility.findMany({ where: { isActive: true, verificationStatus: 'VERIFIED', city: { contains: activePatient.homeCity, mode: 'insensitive' } }, include: { services: true }, take: 20, orderBy: { name: 'asc' } })
      : [];
    const latestRisk = activePatient.riskAssessments[0];
    const appointments = activePatient.followUpPlans.flatMap((plan) => plan.appointments);

    return NextResponse.json({
      success: true,
      data: {
        activePatient: mapPatient(activePatient),
        allPatients: allPatientsRaw.map(mapPatient),
        recoveryHistory: activePatient.recoveryLogs,
        member2_risk: { assessment: latestRisk ? mapRiskAssessment(latestRisk) : null },
        member3_providers: { localProviders },
        member4_travel: { comparison: activePatient.travelComparisons[0] || null },
        member5_orchestration: { plans: activePatient.followUpPlans, appointments },
      },
    });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[integration/cross-module] Aggregation failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Cross-module patient data could not be loaded.' } }, { status: 503 });
  }
}
