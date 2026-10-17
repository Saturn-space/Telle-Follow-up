import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/lib/server/followup-service';
import { VerifyPaymentSchema, ApiResponse } from '@/lib/types/followup';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid signature verification payload.',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const result = FollowUpService.verifyPaymentSignature(parsed.data);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VERIFICATION_FAILED', message: result.error || 'Signature mismatch.' },
        },
        { status: 400 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: { verified: true, message: 'Payment successfully verified server-side.' },
      meta: { timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
