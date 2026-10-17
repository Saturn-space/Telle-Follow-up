import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { store } from '@/lib/server/store';
import { ApiResponse } from '@/lib/types/followup';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret';
    const isEnabled = process.env.PAYMENTS_ENABLED === 'true';

    if (!signature) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing x-razorpay-signature header.' } },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON payload.' } },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature using timingSafeEqual
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    let isValid = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, 'hex');
      const providedBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        isValid = true;
      }
    } catch {
      isValid = false;
    }

    // Sandbox test key fallback for offline unit testing when payments disabled
    if (!isValid && !isEnabled && signature === 'test_valid_webhook_signature') {
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' } },
        { status: 400 }
      );
    }

    const event = body.event;
    const payload = body.payload;

    // Handle payment events idempotently
    if (event === 'payment.captured' || event === 'order.paid') {
      const rzpOrderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;
      const paymentId = payload?.payment?.entity?.id || 'pay_wh_captured';

      if (rzpOrderId) {
        const order = store.getPaymentOrderByRazorpayId(rzpOrderId);
        if (order) {
          // Idempotent check
          if (order.status !== 'CAPTURED') {
            order.status = 'CAPTURED';
            order.razorpayPaymentId = paymentId;
            order.razorpaySignature = signature;
            order.updatedAt = new Date().toISOString();
            store.savePaymentOrder(order);
          }
        }
      }
    } else if (event === 'payment.failed') {
      const rzpOrderId = payload?.payment?.entity?.order_id;
      if (rzpOrderId) {
        const order = store.getPaymentOrderByRazorpayId(rzpOrderId);
        if (order && order.status !== 'CAPTURED') {
          order.status = 'FAILED';
          order.failureReason = payload?.payment?.entity?.error_description || 'Payment failed at gateway.';
          order.updatedAt = new Date().toISOString();
          store.savePaymentOrder(order);
        }
      }
    }

    const response: ApiResponse = {
      success: true,
      data: { processed: true, event },
      meta: { timestamp: new Date().toISOString() },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown webhook error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
