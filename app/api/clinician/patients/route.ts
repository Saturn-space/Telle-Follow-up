import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAuthContext, checkRolePermission } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(req);
    const perm = checkRolePermission(auth, ['CLINICIAN']);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, error: { message: perm.error || 'Clinician access required.' } },
        { status: 403 }
      );
    }

    const patientWhere = {
      OR: [
        { followUpPlans: { some: { approvedByClinicianId: auth.userId } } },
        { riskAssessments: { some: { reviews: { some: { reviewerId: auth.userId } } } } },
      ],
    };
    const patients = await prisma.patient.findMany({
      where: patientWhere,
      include: {
        surgeries: {
          orderBy: { surgeryDate: 'desc' },
          take: 1,
        },
        recoveryLogs: {
          orderBy: { logTimestamp: 'desc' },
          take: 1,
        },
        riskAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        appointments: {
          where: { status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] } },
          orderBy: { scheduledStartTime: 'asc' },
          take: 2,
          include: { teleSession: { select: { id: true, status: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: { patients },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch clinician patient queue.' } },
      { status: 500 }
    );
  }
}
