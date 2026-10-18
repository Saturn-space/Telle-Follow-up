import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['ADMIN']);
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { select: { id: true, mrn: true, fullName: true, contactPhone: true } },
        plan: { select: { id: true, title: true, status: true, approvedByClinicianId: true, approvedByClinician: true } },
        facility: { select: { id: true, name: true, city: true } },
        teleSession: { select: { id: true, domain: true, status: true, startedAt: true, endedAt: true, createdAt: true } },
        outcomeRecord: true,
        paymentOrders: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { scheduledStartTime: 'desc' },
    });
    return NextResponse.json({ success: true, data: { appointments, total: appointments.length } });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    }
    console.error('[admin/appointments] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'ADMIN_APPOINTMENTS_UNAVAILABLE', message: 'Appointment records could not be loaded.' } }, { status: 503 });
  }
}
