import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/lib/server/followup-service';
import { CreatePaymentOrderSchema, ApiResponse } from '@/lib/types/followup';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreatePaymentOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payment order request.',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const result = FollowUpService.createPaymentOrder(parsed.data);

    const response: ApiResponse = {
      success: true,
      data: {
        order: result.order,
        paymentsEnabled: result.isEnabled,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      },
      error: result.error
        ? { code: 'PAYMENTS_DISABLED_OR_UNCONFIGURED', message: result.error }
        : undefined,
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
