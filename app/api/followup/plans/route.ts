import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FollowUpPlanStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated, requirePatientAccess, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';

const createSchema = z.object({
  patientId: z.string().min(1).max(128),
  title: z.string().trim().min(3).max(200),
  clinicalSummary: z.string().trim().min(5).max(4000),
  riskAssessmentId: z.string().optional(),
  travelComparisonId: z.string().optional(),
  startDate: z.coerce.date(),
  targetCompletionDate: z.coerce.date().optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireAuthenticated(context);
    const params = new URL(request.url).searchParams;
    let patientId = params.get('patientId') || undefined;
    if (context.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: context.userId }, select: { id: true } });
      if (!patient || (patientId && patientId !== patient.id)) throw new AccessError('Patients may access only their own care plans.', 403);
      patientId = patient.id;
    } else if (patientId) {
      await requirePatientAccess(context, patientId);
    } else if (context.role === 'CLINICIAN') {
      patientId = undefined;
    }

    const page = Math.max(1, Number(params.get('page') || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25) || 25));
    const where = {
      patientId,
      approvedByClinicianId: context.role === 'CLINICIAN' ? context.userId : undefined,
    };
    const [plans, total] = await prisma.$transaction([
      prisma.followUpPlan.findMany({
        where,
        include: {
          appointments: {
            include: {
              facility: true,
              ...(context.role === 'PATIENT' || context.role === 'CLINICIAN' ? { teleSession: true } : {}),
              outcomeRecord: true,
            },
          },
          riskAssessment: true,
          travelComparison: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.followUpPlan.count({ where }),
    ]);
    return NextResponse.json({ success: true, data: plans, meta: { total, page, limit } });
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    console.error('[followup/plans] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Follow-up plans could not be loaded.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['CLINICIAN', 'COORDINATOR', 'ADMIN']);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Plan details are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    const input = parsed.data;
    if (input.targetCompletionDate && input.targetCompletionDate < input.startDate) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_DATE_RANGE', message: 'Target completion date must be on or after the start date.' } }, { status: 400 });
    }
    await requirePatientAccess(context, input.patientId, { allowUnassignedClinician: true });

    const risk = input.riskAssessmentId
      ? await prisma.riskAssessment.findUnique({ where: { id: input.riskAssessmentId } })
      : await prisma.riskAssessment.findFirst({ where: { patientId: input.patientId }, orderBy: { createdAt: 'desc' } });
    if (!risk || risk.patientId !== input.patientId || risk.reviewStatus === 'PENDING_REVIEW') {
      return NextResponse.json({ success: false, error: { code: 'RISK_REVIEW_REQUIRED', message: 'A current clinician-reviewed risk assessment is required before creating a care plan.' } }, { status: 409 });
    }
    if (risk.createdAt.getTime() < Date.now() - 48 * 60 * 60 * 1000) {
      return NextResponse.json({ success: false, error: { code: 'RISK_REVIEW_STALE', message: 'The risk assessment is older than 48 hours and requires a new clinician review.' } }, { status: 409 });
    }
    if (risk.isEscalated || risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL') {
      return NextResponse.json({ success: false, error: { code: 'CLINICAL_ESCALATION_OVERRIDE', message: 'Routine follow-up planning is suspended for this elevated risk state.' } }, { status: 409 });
    }

    let travelComparisonId: string | undefined;
    if (input.travelComparisonId) {
      const comparison = await prisma.travelComparison.findUnique({ where: { id: input.travelComparisonId }, select: { id: true, patientId: true } });
      if (!comparison || comparison.patientId !== input.patientId) return NextResponse.json({ success: false, error: { code: 'INVALID_TRAVEL_COMPARISON', message: 'The travel comparison does not belong to this patient.' } }, { status: 400 });
      travelComparisonId = comparison.id;
    }

    const clinician = context.role === 'CLINICIAN'
      ? await prisma.user.findUnique({ where: { id: context.userId }, select: { email: true } })
      : null;
    const plan = await prisma.followUpPlan.create({
      data: {
        patientId: input.patientId,
        riskAssessmentId: risk.id,
        travelComparisonId,
        title: input.title,
        clinicalSummary: input.clinicalSummary,
        status: context.role === 'CLINICIAN' ? FollowUpPlanStatus.ACTIVE : FollowUpPlanStatus.DRAFT,
        approvedByClinician: clinician?.email,
        approvedByClinicianId: clinician?.email ? context.userId : undefined,
        approvedAt: clinician ? new Date() : undefined,
        startDate: input.startDate,
        targetCompletionDate: input.targetCompletionDate,
      },
      include: { riskAssessment: true, travelComparison: true, appointments: true },
    });
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    console.error('[followup/plans] Save failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'PLAN_SAVE_UNAVAILABLE', message: 'The follow-up plan could not be saved.' } }, { status: 503 });
  }
}
