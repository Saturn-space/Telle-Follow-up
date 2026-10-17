import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { FollowUpService } from '@/lib/server/followup-service';
import { CreateConsultationRecordSchema, ApiResponse } from '@/lib/types/followup';
import { getAuthContext, checkRolePermission } from '@/lib/server/auth-guard';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get('appointmentId');

    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'appointmentId query parameter is required.' } },
        { status: 400 }
      );
    }

    const record = store.getConsultationRecord(appointmentId);
    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No clinical outcome recorded yet for this visit.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
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

    // Only licensed clinicians can record clinical diagnosis & consultation outcomes
    const perm = checkRolePermission(context, ['CLINICIAN']);
    if (!perm.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access Denied: Only authorized clinicians can sign and submit clinical consultation outcome records.',
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateConsultationRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid consultation outcome payload.',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const result = FollowUpService.recordConsultationOutcome({
      ...parsed.data,
      clinicianId: context.userId || parsed.data.clinicianId,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: result.error } },
        { status: 400 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: result.record,
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
