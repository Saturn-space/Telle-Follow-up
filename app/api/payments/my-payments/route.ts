import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated } from '@/lib/server/db-access';

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireAuthenticated(context);
    if (context.role === 'CLINICIAN') {
      throw new AccessError('Payment history is available to the patient, coordinator, or administrator.', 403);
    }

    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25) || 25));
    const where = context.role === 'PATIENT' ? { userId: context.userId } : {};
    const [payments, total] = await prisma.$transaction([
      prisma.paymentOrder.findMany({
        where,
        include: { plan: true, appointment: { include: { facility: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentOrder.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { payments, currency: 'INR', count: total, page, limit } });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } },
        { status: error.status }
      );
    }
    console.error('[payments/my-payments] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Payment history could not be loaded.' } },
      { status: 503 }
    );
  }
}
