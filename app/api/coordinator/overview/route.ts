import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAuthContext, checkRolePermission } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(req);
    const perm = checkRolePermission(auth, ['COORDINATOR', 'ADMIN']);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, error: { message: perm.error || 'Coordinator access required.' } },
        { status: 403 }
      );
    }

    const [plans, appointments, facilities, referrals] = await Promise.all([
      prisma.followUpPlan.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          patient: { select: { fullName: true, mrn: true, homeCity: true } },
          appointments: true,
        },
      }),
      prisma.appointment.findMany({
        take: 15,
        orderBy: { scheduledStartTime: 'asc' },
        include: {
          patient: { select: { fullName: true, mrn: true } },
          facility: { select: { name: true, city: true } },
          teleSession: { select: { id: true, status: true, startedAt: true, endedAt: true, createdAt: true } },
        },
      }),
      prisma.healthcareFacility.findMany({
        take: 10,
        include: { services: true },
      }),
      prisma.careReferral.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { fullName: true, mrn: true } },
          facility: { select: { name: true, city: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        plans,
        appointments,
        facilities,
        referrals,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Coordinator query failed.' } },
      { status: 500 }
    );
  }
}
