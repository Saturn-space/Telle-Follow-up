import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { FollowUpService } from '@/lib/server/followup-service';
import { UpdateAppointmentStatusSchema, ApiResponse } from '@/lib/types/followup';
import { getAuthContext, checkPatientAccess } from '@/lib/server/auth-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(req);
    const { id } = await params;
    const appointment = store.getAppointment(id);

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Appointment '${id}' not found.` },
        },
        { status: 404 }
      );
    }

    // Cross-patient access protection
    const access = checkPatientAccess(context, appointment.patientId);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: access.error } },
        { status: 403 }
      );
    }

    const patient = store.getPatient(appointment.patientId);
    const provider = appointment.providerId ? store.getProvider(appointment.providerId) : undefined;

    const response: ApiResponse = {
      success: true,
      data: {
        ...appointment,
        patient,
        provider,
      },
      meta: { timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(req);
    const { id } = await params;
    const appointment = store.getAppointment(id);

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Appointment '${id}' not found.` } },
        { status: 404 }
      );
    }

    // Cross-patient access check
    const access = checkPatientAccess(context, appointment.patientId);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: access.error } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateAppointmentStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status update payload.',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    // Patients can only perform CANCELLED transitions on their own appointments
    if (context.role === 'PATIENT' && parsed.data.status !== 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Patients may only request cancellation. Rescheduling and status confirmations require clinician/coordinator coordination.',
          },
        },
        { status: 403 }
      );
    }

    const result = FollowUpService.updateAppointmentStatus(
      id,
      parsed.data.status,
      {
        cancellationReason: parsed.data.cancellationReason,
        newStartTime: parsed.data.newStartTime,
        newEndTime: parsed.data.newEndTime,
      }
    );

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: result.error },
        },
        { status: 400 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: result.appointment,
      meta: { timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
