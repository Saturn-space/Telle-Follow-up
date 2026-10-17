import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { FollowUpService } from '@/lib/server/followup-service';
import { CreateTeleSessionSchema, ApiResponse } from '@/lib/types/followup';
import { getAuthContext, checkPatientAccess } from '@/lib/server/auth-guard';

export async function GET(req: NextRequest) {
  try {
    const context = getAuthContext(req);
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get('appointmentId');
    const sessionId = searchParams.get('sessionId');

    let session = undefined;
    if (sessionId) {
      session = store.getTeleSession(sessionId);
    } else if (appointmentId) {
      session = store.getTeleSessionByAppointment(appointmentId);
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'appointmentId or sessionId required' } },
        { status: 400 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Teleconsultation session not found' } },
        { status: 404 }
      );
    }

    // Verify cross-patient access: only attending clinicians, coordinators, or the specific patient may access the room
    const appt = store.getAppointment(session.appointmentId);
    if (appt) {
      const access = checkPatientAccess(context, appt.patientId);
      if (!access.allowed) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: access.error } },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: session });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateTeleSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid session creation payload.',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const appt = store.getAppointment(parsed.data.appointmentId);
    if (!appt) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } },
        { status: 404 }
      );
    }

    const result = FollowUpService.provisionTeleSession(appt.id, appt.planId);

    const response: ApiResponse = {
      success: true,
      data: result.session,
      meta: { timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
