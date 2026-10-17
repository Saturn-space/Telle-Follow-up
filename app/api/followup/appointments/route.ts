import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { FollowUpService } from '@/lib/server/followup-service';
import { CreateAppointmentSchema, ApiResponse } from '@/lib/types/followup';
import { getAuthContext, checkRolePermission, checkPatientAccess } from '@/lib/server/auth-guard';

export async function GET(req: NextRequest) {
  try {
    const context = getAuthContext(req);
    const { searchParams } = new URL(req.url);
    let patientId = searchParams.get('patientId');
    const planId = searchParams.get('planId');

    // Cross-patient access protection
    if (context.role === 'PATIENT') {
      patientId = context.userId;
    } else if (patientId) {
      const access = checkPatientAccess(context, patientId);
      if (!access.allowed) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: access.error } },
          { status: 403 }
        );
      }
    }

    let appointments = [];
    if (patientId) {
      appointments = store.getAppointmentsByPatient(patientId);
    } else if (planId) {
      appointments = store.getAppointmentsByPlan(planId);
    } else {
      const allPatients = store.getAllPatients();
      appointments = allPatients.flatMap((p) => store.getAppointmentsByPatient(p.id));
    }

    const response: ApiResponse = {
      success: true,
      data: appointments,
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

export async function POST(req: NextRequest) {
  try {
    const context = getAuthContext(req);

    // Only Clinicians, Coordinators, and Admins can schedule clinical appointments
    const perm = checkRolePermission(context, ['CLINICIAN', 'COORDINATOR', 'ADMIN']);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: perm.error } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid appointment payload.',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const result = FollowUpService.createAppointment(parsed.data);

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
    return NextResponse.json(response, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
