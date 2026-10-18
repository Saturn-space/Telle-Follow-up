import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { AppointmentStatus, AppointmentType, TeleSessionStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';

const createSchema = z.object({
  planId: z.string().min(1).max(128),
  patientId: z.string().min(1).max(128),
  providerId: z.string().min(1).max(128).optional(),
  type: z.nativeEnum(AppointmentType),
  scheduledStartTime: z.coerce.date(),
  scheduledEndTime: z.coerce.date(),
  locationOrService: z.string().trim().min(2).max(500),
  clinicalNotes: z.string().trim().max(4000).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    // Administrators use the dedicated all-records view. Keep this shared
    // appointment feed limited to care participants and coordinators.
    requireRoles(context, ['PATIENT', 'CLINICIAN', 'COORDINATOR']);
    const params = new URL(request.url).searchParams;
    let patientId = params.get('patientId') || undefined;
    const planId = params.get('planId') || undefined;

    if (context.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: context.userId }, select: { id: true } });
      if (!patient || (patientId && patientId !== patient.id)) throw new AccessError('Patients may access only their own appointments.', 403);
      patientId = patient.id;
    } else if (patientId) {
      await requirePatientAccess(context, patientId);
    }

    if (planId) {
      const plan = await prisma.followUpPlan.findUnique({ where: { id: planId }, select: { id: true, patientId: true } });
      if (!plan) throw new AccessError('Care plan was not found.', 404);
      await requirePatientAccess(context, plan.patientId);
      if (patientId && patientId !== plan.patientId) throw new AccessError('Care plan does not belong to this patient.', 403);
      patientId = plan.patientId;
    }

    const page = Math.max(1, Number(params.get('page') || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25) || 25));
    const where = {
      patientId,
      planId,
      plan: context.role === 'CLINICIAN' ? { approvedByClinicianId: context.userId } : undefined,
    };
    const [appointments, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: {
          facility: true,
          ...(context.role === 'PATIENT' || context.role === 'CLINICIAN' ? { teleSession: true } : {}),
          outcomeRecord: true,
          plan: true,
        },
        orderBy: { scheduledStartTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);
    return NextResponse.json({ success: true, data: appointments, meta: { total, page, limit } });
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    console.error('[followup/appointments] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Appointments could not be loaded.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['CLINICIAN', 'COORDINATOR', 'ADMIN']);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Appointment details are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    const input = parsed.data;
    if (input.scheduledStartTime <= new Date() || input.scheduledEndTime <= input.scheduledStartTime) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_DATE_RANGE', message: 'Appointment must be scheduled in the future with an end time after its start.' } }, { status: 400 });
    }
    await requirePatientAccess(context, input.patientId, { allowUnassignedClinician: true });

    const plan = await prisma.followUpPlan.findUnique({ where: { id: input.planId }, include: { riskAssessment: true } });
    if (!plan || plan.patientId !== input.patientId) return NextResponse.json({ success: false, error: { code: 'INVALID_PLAN', message: 'The selected plan does not belong to this patient.' } }, { status: 400 });
    if (plan.status !== 'ACTIVE' || !plan.riskAssessment || !['ACCEPTED', 'OVERRIDDEN'].includes(plan.riskAssessment.reviewStatus)) {
      return NextResponse.json({ success: false, error: { code: 'PLAN_NOT_APPROVED', message: 'An active plan with a clinician-reviewed risk assessment is required.' } }, { status: 409 });
    }
    if (plan.riskAssessment.createdAt.getTime() < Date.now() - 48 * 60 * 60 * 1000 || plan.riskAssessment.isEscalated || ['HIGH', 'CRITICAL'].includes(plan.riskAssessment.riskLevel)) {
      return NextResponse.json({ success: false, error: { code: 'CLINICAL_ESCALATION_OVERRIDE', message: 'The latest risk state blocks routine appointment scheduling.' } }, { status: 409 });
    }
    if (context.role === 'CLINICIAN' && plan.approvedByClinicianId !== context.userId) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the clinician assigned to this plan may schedule its appointment.' } }, { status: 403 });
    }

    let facilityId: string | undefined;
    if (input.providerId) {
      const facility = await prisma.healthcareFacility.findUnique({ where: { id: input.providerId, isActive: true }, select: { id: true, verificationStatus: true } });
      if (!facility) return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_FOUND', message: 'Selected facility is unavailable.' } }, { status: 404 });
      if (facility.verificationStatus !== 'VERIFIED') return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_VERIFIED', message: 'Appointments can be booked only with verified facilities.' } }, { status: 409 });
      facilityId = facility.id;
    }
    if (['LOCAL_CLINIC_VISIT', 'DIAGNOSTIC_LAB'].includes(input.type) && !facilityId) {
      return NextResponse.json({ success: false, error: { code: 'FACILITY_REQUIRED', message: 'Select a verified facility before scheduling this visit.' } }, { status: 400 });
    }

    const collision = await prisma.appointment.findFirst({
      where: {
        patientId: input.patientId,
        status: { in: [AppointmentStatus.PROPOSED, AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
        scheduledStartTime: { lt: input.scheduledEndTime },
        scheduledEndTime: { gt: input.scheduledStartTime },
      },
      select: { id: true },
    });
    if (collision) return NextResponse.json({ success: false, error: { code: 'SCHEDULE_CONFLICT', message: 'This time overlaps another active appointment.' } }, { status: 409 });

    const appointment = await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          planId: plan.id,
          patientId: input.patientId,
          facilityId,
          type: input.type,
          status: AppointmentStatus.SCHEDULED,
          scheduledStartTime: input.scheduledStartTime,
          scheduledEndTime: input.scheduledEndTime,
          locationOrService: input.locationOrService,
          clinicalNotes: input.clinicalNotes,
        },
      });
      if (input.type === AppointmentType.TELECONSULTATION) {
        const configuredDomain = process.env.JITSI_DOMAIN || 'meet.jit.si';
        const domain = configuredDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!/^[a-zA-Z0-9.-]+$/.test(domain)) throw new Error('JITSI_DOMAIN configuration is invalid.');
        await tx.teleconsultationSession.create({
          data: {
            planId: plan.id,
            appointmentId: created.id,
            roomName: `tfo-sess-${randomBytes(16).toString('hex')}`,
            domain,
            status: TeleSessionStatus.READY,
          },
        });
      }
      const patient = await tx.patient.findUnique({ where: { id: input.patientId }, select: { userId: true } });
      if (patient?.userId) {
        await tx.notification.create({
          data: {
            recipientUserId: patient.userId,
            type: 'APPOINTMENT_SCHEDULED',
            title: 'Follow-up appointment scheduled',
            message: 'A follow-up appointment was added to your care plan.',
            deliveryStatus: 'IN_APP',
            linkUrl: '/follow-ups/my-appointments',
          },
        });
      }
      await tx.auditLog.create({
        data: { userId: context.userId, userEmail: context.email, userRole: context.role, action: 'APPOINTMENT_CREATE', entityType: 'APPOINTMENT', entityId: created.id },
      });
      return tx.appointment.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          facility: true,
          ...(context.role === 'CLINICIAN' ? { teleSession: true } : {}),
          outcomeRecord: true,
        },
      });
    });
    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    console.error('[followup/appointments] Save failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'APPOINTMENT_SAVE_UNAVAILABLE', message: 'The appointment could not be saved.' } }, { status: 503 });
  }
}
