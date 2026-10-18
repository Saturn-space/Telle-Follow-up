import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated, requirePatientAccess, requireRoles } from '@/lib/server/db-access';
import { CreateConsultationRecordSchema } from '@/lib/types/followup';

export const runtime = 'nodejs';
const recordSchema = CreateConsultationRecordSchema.omit({ clinicianId: true });

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireAuthenticated(context);
    const appointmentId = new URL(request.url).searchParams.get('appointmentId');
    if (!appointmentId) return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'appointmentId is required.' } }, { status: 400 });
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { plan: true, outcomeRecord: true } });
    if (!appointment) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment was not found.' } }, { status: 404 });
    await requirePatientAccess(context, appointment.patientId);
    if (context.role === 'CLINICIAN' && appointment.plan.approvedByClinicianId !== context.userId) throw new AccessError('This consultation is not assigned to your account.', 403);
    if (!appointment.outcomeRecord) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No clinical outcome has been recorded for this visit.' } }, { status: 404 });
    return NextResponse.json({ success: true, data: appointment.outcomeRecord });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[teleconsult/records] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'The consultation record could not be loaded.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['CLINICIAN']);
    const parsed = recordSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Consultation notes are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    const input = parsed.data;
    const appointment = await prisma.appointment.findUnique({ where: { id: input.appointmentId }, include: { plan: true, teleSession: true, outcomeRecord: true } });
    if (!appointment) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment was not found.' } }, { status: 404 });
    await requirePatientAccess(context, appointment.patientId);
    if (appointment.plan.approvedByClinicianId !== context.userId) throw new AccessError('Only the assigned clinician may submit this consultation record.', 403);
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: { code: 'INVALID_APPOINTMENT_STATE', message: 'This appointment cannot accept a consultation record.' } }, { status: 409 });
    }
    if (appointment.outcomeRecord) return NextResponse.json({ success: false, error: { code: 'RECORD_ALREADY_EXISTS', message: 'A consultation record already exists for this appointment.' } }, { status: 409 });
    if (input.teleSessionId && appointment.teleSession?.id !== input.teleSessionId) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_SESSION', message: 'The selected consultation session is not linked to this appointment.' } }, { status: 400 });
    }

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.consultationRecord.create({
        data: {
          appointmentId: appointment.id,
          teleSessionId: input.teleSessionId,
          clinicianId: context.userId,
          subjectiveNotes: input.subjectiveNotes,
          objectiveFindings: input.objectiveFindings,
          assessmentPlan: input.assessmentPlan,
          followUpRequired: input.followUpRequired,
          nextFollowUpDate: input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : undefined,
        },
      });
      await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'COMPLETED' } });
      if (appointment.teleSession) await tx.teleconsultationSession.update({ where: { id: appointment.teleSession.id }, data: { status: 'COMPLETED', endedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: context.userId, userEmail: context.email, userRole: context.role, action: 'CONSULTATION_RECORD', entityType: 'CONSULTATION_RECORD', entityId: created.id } });
      return created;
    });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[teleconsult/records] Save failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'CONSULTATION_SAVE_UNAVAILABLE', message: 'The consultation record could not be saved.' } }, { status: 503 });
  }
}
