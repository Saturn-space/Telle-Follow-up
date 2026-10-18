import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';

const verifySchema = z.object({
  orderId: z.string().min(1).max(128),
  razorpayOrderId: z.string().min(1).max(128),
  razorpayPaymentId: z.string().min(1).max(128),
  razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['PATIENT']);
    if (process.env.PAYMENTS_ENABLED !== 'true') return NextResponse.json({ success: false, error: { code: 'PAYMENTS_DISABLED', message: 'Payment verification is unavailable while payments are disabled.' } }, { status: 503 });
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ success: false, error: { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Payment provider credentials are not configured.' } }, { status: 503 });
    const parsed = verifySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Payment verification details are invalid.' } }, { status: 400 });

    const input = parsed.data;
    const order = await prisma.paymentOrder.findFirst({ where: { id: input.orderId, razorpayOrderId: input.razorpayOrderId, userId: context.userId } });
    if (!order) return NextResponse.json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'The payment order was not found for this account.' } }, { status: 404 });
    const appointment = order.appointmentId
      ? await prisma.appointment.findUnique({ where: { id: order.appointmentId }, select: { patientId: true } })
      : null;
    if (!appointment) return NextResponse.json({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'The payment is not linked to an appointment.' } }, { status: 409 });
    await requirePatientAccess(context, appointment.patientId);
    if (order.status === 'CAPTURED') return NextResponse.json({ success: true, data: { verified: true, alreadyCaptured: true, order } });

    const expected = crypto.createHmac('sha256', keySecret).update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`).digest();
    const provided = Buffer.from(input.razorpaySignature, 'hex');
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return NextResponse.json({ success: false, error: { code: 'VERIFICATION_FAILED', message: 'Payment signature verification failed.' } }, { status: 400 });
    }

    const providerResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.razorpayPaymentId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!providerResponse.ok) {
      console.error('[payments/verify] Provider payment lookup failed:', providerResponse.status);
      return NextResponse.json({ success: false, error: { code: 'PAYMENT_PROVIDER_UNAVAILABLE', message: 'The payment provider could not confirm the transaction status.' } }, { status: 502 });
    }
    const payment = await providerResponse.json() as { id?: string; order_id?: string; amount?: number; currency?: string; status?: string };
    if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.amount || payment.currency !== 'INR') {
      return NextResponse.json({ success: false, error: { code: 'PAYMENT_DETAILS_MISMATCH', message: 'The provider transaction does not match this order.' } }, { status: 400 });
    }
    if (!['authorized', 'captured'].includes(payment.status || '')) {
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED', signatureVerified: false, failureReason: 'Provider reports payment not authorized or captured.' } });
      return NextResponse.json({ success: false, error: { code: 'PAYMENT_NOT_COMPLETED', message: 'The payment provider has not authorized or captured this transaction.' } }, { status: 409 });
    }

    const status = payment.status === 'captured' ? 'CAPTURED' : 'AUTHORIZED';
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status,
          signatureVerified: true,
          verifiedAt: new Date(),
          razorpayPaymentId: payment.id,
          razorpaySignature: input.razorpaySignature,
        },
      });
      await tx.auditLog.create({ data: { userId: context.userId, userEmail: context.email, userRole: context.role, action: 'PAYMENT_VERIFIED', entityType: 'PAYMENT_ORDER', entityId: order.id, details: `Provider confirmed payment status: ${status}.` } });
      return saved;
    });
    return NextResponse.json({ success: true, data: { verified: true, order: updated, message: status === 'CAPTURED' ? 'Payment captured.' : 'Payment authorized; capture is still pending.' } }, { status: status === 'CAPTURED' ? 200 : 202 });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[payments/verify] Verification failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'PAYMENT_VERIFICATION_UNAVAILABLE', message: 'The payment could not be verified.' } }, { status: 503 });
  }
}
