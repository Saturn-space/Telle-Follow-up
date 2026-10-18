import { NextRequest, NextResponse } from 'next/server';
import { AppointmentStatus, TeleSessionStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';
import { UpdateAppointmentStatusSchema } from '@/lib/types/followup';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ id: string }> };

async function getAppointment(id: string, canJoinConsultation: boolean) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      plan: true,
      facility: true,
      ...(canJoinConsultation ? { teleSession: true } : {}),
      outcomeRecord: true,
    },
  });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['PATIENT', 'CLINICIAN', 'COORDINATOR']);
    const { id } = await params;
    const appointment = await getAppointment(id, context.role === 'PATIENT' || context.role === 'CLINICIAN');
    if (!appointment) throw new AccessError('Appointment was not found.', 404);
    await requirePatientAccess(context, appointment.patientId);
    if (context.role === 'CLINICIAN' && appointment.plan.approvedByClinicianId !== context.userId) throw new AccessError('This appointment is not assigned to your account.', 403);
    return NextResponse.json({ success: true, data: appointment });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[followup/appointments/:id] Lookup failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'The appointment could not be loaded.' } }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const context = await getVerifiedAuthContext(request);
    if (!context.isAuthorized) throw new AccessError('A valid session is required.', 401);
    const { id } = await params;
    const appointment = await getAppointment(id, false);
    if (!appointment) throw new AccessError('Appointment was not found.', 404);
    await requirePatientAccess(context, appointment.patientId);
    if (context.role === 'CLINICIAN' && appointment.plan.approvedByClinicianId !== context.userId) throw new AccessError('This appointment is not assigned to your account.', 403);

    const parsed = UpdateAppointmentStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Appointment update details are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    const input = parsed.data;
    if (input.status === 'COMPLETED') return NextResponse.json({ success: false, error: { code: 'CONSULTATION_RECORD_REQUIRED', message: 'An appointment can be completed only when a clinician submits the consultation record.' } }, { status: 409 });
    if (context.role === 'PATIENT' && input.status !== 'CANCELLED') throw new AccessError('Patients may request cancellation; a care team member must change other appointment states.', 403);
    if (context.role !== 'PATIENT') requireRoles(context, ['CLINICIAN', 'COORDINATOR', 'ADMIN']);
    if (input.status === 'CANCELLED' && !input.cancellationReason?.trim()) {
      return NextResponse.json({ success: false, error: { code: 'CANCELLATION_REASON_REQUIRED', message: 'Add a cancellation reason.' } }, { status: 400 });
    }

    const newStart = input.newStartTime ? new Date(input.newStartTime) : undefined;
    const newEnd = input.newEndTime ? new Date(input.newEndTime) : undefined;
    if (input.status === 'RESCHEDULED' && (!newStart || !newEnd || newStart <= new Date() || newEnd <= newStart)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_DATE_RANGE', message: 'Rescheduling needs a future start time and a later end time.' } }, { status: 400 });
    }
    if (newStart && newEnd) {
      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          patientId: appointment.patientId,
          status: { in: [AppointmentStatus.PROPOSED, AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          scheduledStartTime: { lt: newEnd },
          scheduledEndTime: { gt: newStart },
        },
        select: { id: true },
      });
      if (conflict) return NextResponse.json({ success: false, error: { code: 'SCHEDULE_CONFLICT', message: 'This time overlaps another active appointment.' } }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.update({
        where: { id },
        data: {
          status: input.status as AppointmentStatus,
          cancellationReason: input.status === 'CANCELLED' ? input.cancellationReason?.trim() : undefined,
          scheduledStartTime: newStart,
          scheduledEndTime: newEnd,
        },
      });
      if (input.status === 'CANCELLED') {
        await tx.teleconsultationSession.updateMany({ where: { appointmentId: id, status: { not: TeleSessionStatus.COMPLETED } }, data: { status: TeleSessionStatus.EXPIRED } });
      }
      await tx.auditLog.create({
        data: {
          userId: context.userId,
          userEmail: context.email,
          userRole: context.role,
          action: input.status === 'CANCELLED'
            ? 'APPOINTMENT_CANCEL'
            : input.status === 'RESCHEDULED'
              ? 'APPOINTMENT_RESCHEDULE'
              : 'APPOINTMENT_UPDATE',
          entityType: 'APPOINTMENT',
          entityId: id,
          details: `Appointment state updated to ${input.status}.`,
        },
      });
      return tx.appointment.findUniqueOrThrow({
        where: { id: row.id },
        include: {
          facility: true,
          ...(context.role === 'PATIENT' || context.role === 'CLINICIAN' ? { teleSession: true } : {}),
          outcomeRecord: true,
        },
      });
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[followup/appointments/:id] Update failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'APPOINTMENT_UPDATE_UNAVAILABLE', message: 'Appointment changes could not be saved.' } }, { status: 503 });
  }
}
