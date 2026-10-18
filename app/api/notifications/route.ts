import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated, requireRoles } from '@/lib/server/db-access';

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireAuthenticated(context);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 50) || 50));
    let where: { recipientUserId?: string };
    if (context.role === 'PATIENT') {
      where = { recipientUserId: context.userId };
    } else {
      requireRoles(context, ['COORDINATOR', 'ADMIN']);
      const recipientUserId = params.get('recipientUserId') || undefined;
      where = recipientUserId ? { recipientUserId } : {};
    }
    const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit });
    return NextResponse.json({ success: true, data: notifications, meta: { count: notifications.length, page, limit } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[notifications] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Notifications could not be loaded.' } }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireAuthenticated(context);
    const body = await request.json() as { id?: unknown };
    if (typeof body.id !== 'string' || !body.id) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Notification id is required.' } }, { status: 400 });
    const notification = await prisma.notification.findUnique({ where: { id: body.id }, select: { id: true, recipientUserId: true } });
    if (!notification) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification was not found.' } }, { status: 404 });
    if (context.role === 'PATIENT' && notification.recipientUserId !== context.userId) throw new AccessError('Patients may update only their own notifications.', 403);
    if (context.role !== 'PATIENT') requireRoles(context, ['COORDINATOR', 'ADMIN']);
    const updated = await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[notifications] Update failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'NOTIFICATION_UPDATE_UNAVAILABLE', message: 'Notification state could not be saved.' } }, { status: 503 });
  }
}
