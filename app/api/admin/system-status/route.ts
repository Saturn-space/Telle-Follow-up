import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAuthContext, checkRolePermission } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(req);
    const perm = checkRolePermission(auth, ['ADMIN']);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, error: { message: perm.error || 'Administrator access required.' } },
        { status: 403 }
      );
    }

    const [userCount, patientCount, appointmentCount, facilityCount, paymentOrderCount, pendingApplications] = await Promise.all([
      prisma.user.count(),
      prisma.patient.count(),
      prisma.appointment.count({ where: { status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] } } }),
      prisma.healthcareFacility.count({ where: { isActive: true, verificationStatus: 'VERIFIED' } }),
      prisma.paymentOrder.count(),
      prisma.clinicianRegistrationApplication.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalUsers: userCount,
          registeredPatients: patientCount,
          activeAppointments: appointmentCount,
          verifiedFacilities: facilityCount,
          totalPaymentOrders: paymentOrderCount,
          pendingClinicianApplications: pendingApplications,
        },
      },
    });
  } catch (err: unknown) {
    console.error('[admin/system-status] Status query failed:', err instanceof Error ? err.name : 'unknown error');
    return NextResponse.json(
      { success: false, error: { message: 'System status could not be loaded.' } },
      { status: 500 }
    );
  }
}
