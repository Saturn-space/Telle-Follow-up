import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/lib/server/followup-service';
import { CreatePaymentOrderSchema, ApiResponse } from '@/lib/types/followup';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreatePaymentOrderSchema.safeParse(body);

    if (!parsed.success) {
      const issueMsg = parsed.error.issues[0]?.message || 'Invalid payment order request.';
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issueMsg,
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const userId = req.headers.get('x-user-id') || undefined;

    const result = FollowUpService.createPaymentOrder({
      ...parsed.data,
      userId,
    });

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_CREATION_FAILED',
            message: result.error,
          },
        },
        { status: 400 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: {
        order: result.order,
        currency: 'INR',
        amountPaise: result.order?.amount,
        amountRupees: (result.order?.amount || 0) / 100,
        paymentsEnabled: result.isEnabled,
        keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      },
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
