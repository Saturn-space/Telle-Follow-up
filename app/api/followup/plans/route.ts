import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { FollowUpService } from '@/lib/server/followup-service';
import { CreatePlanSchema, ApiResponse } from '@/lib/types/followup';
import { getAuthContext, checkRolePermission, checkPatientAccess } from '@/lib/server/auth-guard';

export async function GET(req: NextRequest) {
  try {
    const context = getAuthContext(req);
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || undefined;

    // Cross-patient access protection: A patient can only view their own plans
    if (patientId) {
      const access = checkPatientAccess(context, patientId);
      if (!access.allowed) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: access.error } },
          { status: 403 }
        );
      }
    } else if (context.role === 'PATIENT') {
      // If no query param and user is patient, constrain strictly to their own ID
      const patientPlans = store.getAllPlans(context.userId);
      return NextResponse.json({
        success: true,
        data: patientPlans,
        meta: { timestamp: new Date().toISOString() },
      });
    }

    const plans = store.getAllPlans(patientId);

    const response: ApiResponse = {
      success: true,
      data: plans,
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

    // Only Clinicians, Coordinators, and Admins can create follow-up plans
    const perm = checkRolePermission(context, ['CLINICIAN', 'COORDINATOR', 'ADMIN']);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: perm.error } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid plan input data.',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const result = FollowUpService.createPlan({
      ...parsed.data,
      approvedByClinician:
        parsed.data.approvedByClinician || (context.role === 'CLINICIAN' ? context.userId : undefined),
    });

    if (result.error) {
      const status = result.isEscalated ? 409 : 400; // 409 Conflict if Clinical Safety Escalation blocks it
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.isEscalated ? 'CLINICAL_ESCALATION_OVERRIDE' : 'BAD_REQUEST',
            message: result.error,
          },
        },
        { status }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: result.plan,
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
