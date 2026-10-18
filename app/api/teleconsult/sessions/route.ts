import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { TeleSessionStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';
const createSchema = z.object({ appointmentId: z.string().min(1).max(128) });

function authError(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['PATIENT', 'CLINICIAN']);
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const appointmentId = params.get('appointmentId');
    if (!sessionId && !appointmentId) return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Provide a sessionId or appointmentId.' } }, { status: 400 });
    const session = await prisma.teleconsultationSession.findFirst({
      where: sessionId ? { id: sessionId } : { appointmentId: appointmentId! },
      include: { appointment: { include: { plan: true, patient: true, outcomeRecord: true } } },
    });
    if (!session) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Teleconsultation session was not found.' } }, { status: 404 });
    await requirePatientAccess(context, session.appointment.patientId);
    if (context.role === 'CLINICIAN' && session.appointment.plan.approvedByClinicianId !== context.userId) {
      throw new AccessError('This consultation is not assigned to your account.', 403);
    }
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error('[teleconsult/sessions] Lookup failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Teleconsultation details could not be loaded.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['PATIENT', 'CLINICIAN']);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid appointmentId is required.' } }, { status: 400 });
    const appointment = await prisma.appointment.findUnique({ where: { id: parsed.data.appointmentId }, include: { plan: true } });
    if (!appointment) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment was not found.' } }, { status: 404 });
    await requirePatientAccess(context, appointment.patientId);
    if (context.role === 'CLINICIAN' && appointment.plan.approvedByClinicianId !== context.userId) throw new AccessError('This consultation is not assigned to your account.', 403);
    if (appointment.type !== 'TELECONSULTATION' || !['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(appointment.status)) {
      return NextResponse.json({ success: false, error: { code: 'CONSULTATION_NOT_AVAILABLE', message: 'A scheduled teleconsultation appointment is required to open a room.' } }, { status: 409 });
    }

    const configuredDomain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    const domain = configuredDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!/^[a-zA-Z0-9.-]+$/.test(domain)) throw new Error('JITSI_DOMAIN configuration is invalid.');
    const session = await prisma.teleconsultationSession.upsert({
      where: { appointmentId: appointment.id },
      update: {},
      create: {
        planId: appointment.planId,
        appointmentId: appointment.id,
        roomName: `tfo-sess-${randomBytes(16).toString('hex')}`,
        domain,
        status: TeleSessionStatus.READY,
      },
      include: { appointment: { include: { plan: true } } },
    });
    return NextResponse.json({ success: true, data: session }, { status: 200 });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error('[teleconsult/sessions] Provision failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'TELECONSULT_UNAVAILABLE', message: 'The consultation room could not be provisioned. Check video provider configuration.' } }, { status: 503 });
  }
}
