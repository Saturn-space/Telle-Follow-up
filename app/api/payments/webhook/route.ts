import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RazorpayWebhook = {
  id?: string;
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; currency?: string; amount?: number; error_description?: string } };
    order?: { entity?: { id?: string; amount?: number; currency?: string } };
  };
};

export async function POST(request: NextRequest) {
  try {
    if (process.env.PAYMENTS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: { code: 'PAYMENTS_DISABLED', message: 'Payment webhooks are disabled.' } }, { status: 503 });
    }
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ success: false, error: { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Webhook verification is not configured.' } }, { status: 503 });
    }

    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'A webhook signature is required.' } }, { status: 400 });
    }
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature format is invalid.' } }, { status: 400 });
    }

    const rawBody = await request.text();
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest();
    const provided = Buffer.from(signature, 'hex');
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' } }, { status: 400 });
    }

    let body: RazorpayWebhook;
    try {
      body = JSON.parse(rawBody) as RazorpayWebhook;
    } catch {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PAYLOAD', message: 'Webhook payload is not valid JSON.' } }, { status: 400 });
    }
    if (!body.event) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PAYLOAD', message: 'Webhook event type is required.' } }, { status: 400 });
    }

    const payment = body.payload?.payment?.entity;
    const providerEventId = request.headers.get('x-razorpay-event-id') || body.id || (payment?.id ? `evt_${payment.id}` : undefined);
    if (!providerEventId) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PAYLOAD', message: 'Webhook event id is required.' } }, { status: 400 });
    }

    const existingEvent = await prisma.paymentOrder.findFirst({ where: { webhookEventId: providerEventId }, select: { id: true } });
    if (existingEvent) return NextResponse.json({ success: true, data: { processed: true, alreadyHandled: true } });
    if (!['payment.captured', 'order.paid', 'payment.failed'].includes(body.event)) {
      return NextResponse.json({ success: true, data: { processed: true, ignored: true, event: body.event } });
    }

    const razorpayOrderId = payment?.order_id || body.payload?.order?.entity?.id;
    if (!razorpayOrderId) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PAYLOAD', message: 'Webhook payload has no order reference.' } }, { status: 400 });
    }
    const order = await prisma.paymentOrder.findUnique({ where: { razorpayOrderId } });
    if (!order) return NextResponse.json({ success: true, data: { processed: true, unmatched: true } });

    const currency = payment?.currency || body.payload?.order?.entity?.currency;
    const amount = payment?.amount ?? body.payload?.order?.entity?.amount;
    if (currency && currency !== 'INR') {
      return NextResponse.json({ success: false, error: { code: 'INVALID_CURRENCY', message: 'Only INR payments are accepted.' } }, { status: 400 });
    }
    if (amount !== undefined && amount !== order.amount) {
      return NextResponse.json({ success: false, error: { code: 'AMOUNT_MISMATCH', message: 'Webhook amount does not match the stored order.' } }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (body.event === 'payment.captured' || body.event === 'order.paid') {
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: 'CAPTURED',
            signatureVerified: true,
            verifiedAt: new Date(),
            razorpayPaymentId: payment?.id,
            webhookEventId: providerEventId,
          },
        });
      } else if (order.status !== 'CAPTURED') {
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            signatureVerified: false,
            failureReason: payment?.error_description || 'Payment failed at provider.',
            webhookEventId: providerEventId,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: order.userId || undefined,
          userRole: 'PATIENT',
          action: 'PAYMENT_VERIFIED',
          entityType: 'PAYMENT_ORDER',
          entityId: order.id,
          details: `Verified provider webhook event ${body.event}.`,
        },
      });
    });

    return NextResponse.json({ success: true, data: { processed: true, event: body.event } });
  } catch (error) {
    console.error('[payments/webhook] Processing failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'WEBHOOK_PROCESSING_UNAVAILABLE', message: 'The payment event could not be processed.' } }, { status: 503 });
  }
}
