import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';
import { CreatePaymentOrderSchema, SERVICE_PRICING_INR } from '@/lib/types/followup';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rawClone = request.clone();
    try {
      const peek = await rawClone.json();
      if (peek.currency && peek.currency !== 'INR') {
        return NextResponse.json({ success: false, error: { code: 'INVALID_CURRENCY', message: 'Only INR currency is supported.' } }, { status: 400 });
      }
    } catch {}
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['PATIENT']);
    if (process.env.PAYMENTS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: { code: 'PAYMENTS_DISABLED', message: 'Payments are disabled. Care and follow-up services remain available.' } }, { status: 503 });
    }
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ success: false, error: { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Payment provider credentials are not configured.' } }, { status: 503 });

    const parsed = CreatePaymentOrderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Payment order details are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    const input = parsed.data;
    if (input.currency && input.currency !== 'INR') return NextResponse.json({ success: false, error: { code: 'INVALID_CURRENCY', message: 'Only INR payments are supported.' } }, { status: 400 });
    const pricing = SERVICE_PRICING_INR[input.serviceType || 'TELECONSULTATION'];
    if (!pricing) return NextResponse.json({ success: false, error: { code: 'UNSUPPORTED_SERVICE', message: 'The selected service has no configured payment amount.' } }, { status: 400 });

    const appointment = await prisma.appointment.findUnique({ where: { id: input.appointmentId }, include: { plan: true } });
    if (!appointment || appointment.planId !== input.planId) return NextResponse.json({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'The appointment does not belong to this care plan.' } }, { status: 404 });
    await requirePatientAccess(context, appointment.patientId);
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') return NextResponse.json({ success: false, error: { code: 'INVALID_APPOINTMENT_STATE', message: 'Payment is not available for this appointment.' } }, { status: 409 });

    const captured = await prisma.paymentOrder.findFirst({ where: { appointmentId: appointment.id, status: 'CAPTURED' }, select: { id: true } });
    if (captured) return NextResponse.json({ success: false, error: { code: 'ALREADY_PAID', message: 'This appointment already has a captured payment.' } }, { status: 409 });

    const receipt = `tfo_${randomUUID().replace(/-/g, '')}`;
    const providerResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: pricing.paise, currency: 'INR', receipt, notes: { planId: input.planId, appointmentId: appointment.id } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!providerResponse.ok) {
      console.error('[payments/create-order] Provider rejected order:', providerResponse.status);
      return NextResponse.json({ success: false, error: { code: 'PAYMENT_PROVIDER_UNAVAILABLE', message: 'The payment provider did not accept the order request.' } }, { status: 502 });
    }
    const providerOrder = await providerResponse.json() as { id?: string; amount?: number; currency?: string; receipt?: string };
    if (!providerOrder.id || providerOrder.amount !== pricing.paise || providerOrder.currency !== 'INR') {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PROVIDER_RESPONSE', message: 'The payment provider returned an invalid order response.' } }, { status: 502 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentOrder.create({
        data: {
          userId: context.userId,
          planId: input.planId,
          appointmentId: appointment.id,
          serviceType: input.serviceType || 'TELECONSULTATION',
          amount: pricing.paise,
          currency: 'INR',
          receipt,
          status: 'PENDING',
          razorpayOrderId: providerOrder.id!,
        },
      });
      await tx.auditLog.create({ data: { userId: context.userId, userEmail: context.email, userRole: context.role, action: 'PAYMENT_CREATE', entityType: 'PAYMENT_ORDER', entityId: created.id } });
      return created;
    });
    return NextResponse.json({
      success: true,
      data: { order, currency: 'INR', amountPaise: pricing.paise, amountRupees: pricing.rupees, keyId },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[payments/create-order] Order creation failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'PAYMENT_UNAVAILABLE', message: 'A payment order could not be created.' } }, { status: 503 });
  }
}
