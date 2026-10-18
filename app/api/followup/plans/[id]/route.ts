import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess } from '@/lib/server/db-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getVerifiedAuthContext(request);
    if (!context.isAuthorized) throw new AccessError('A valid session is required.', 401);
    const { id } = await params;
    const plan = await prisma.followUpPlan.findUnique({
      where: { id },
      include: {
        patient: true,
        riskAssessment: { include: { contributingFactors: true, clinicalAlerts: true } },
        travelComparison: true,
        appointments: {
          include: {
            facility: true,
            ...(context.role === 'PATIENT' || context.role === 'CLINICIAN' ? { teleSession: true } : {}),
            outcomeRecord: true,
          },
        },
      },
    });
    if (!plan) throw new AccessError('Care plan was not found.', 404);
    await requirePatientAccess(context, plan.patientId);
    if (context.role === 'CLINICIAN' && plan.approvedByClinicianId !== context.userId) throw new AccessError('This care plan is not assigned to your account.', 403);
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[followup/plans/:id] Lookup failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'The care plan could not be loaded.' } }, { status: 503 });
  }
}
