import { NextResponse } from 'next/server';

export async function GET() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const enabled = process.env.PAYMENTS_ENABLED === 'true' && Boolean(keyId && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
  return NextResponse.json({
    success: true,
    data: {
      enabled,
      keyId: enabled ? keyId : undefined,
      message: enabled ? 'Payment provider is configured.' : 'Payments are disabled or provider credentials are incomplete. Care is not gated by payment.',
    },
  });
}
