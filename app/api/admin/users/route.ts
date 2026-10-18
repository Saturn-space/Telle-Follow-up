import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAuthContext, checkRolePermission } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/prisma';
import { Role, AuditAction } from '@/generated/prisma';

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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        patientProfile: {
          select: {
            id: true,
            mrn: true,
            fullName: true,
            homeCity: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch users.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(req);
    const perm = checkRolePermission(auth, ['ADMIN']);
    if (!perm.allowed) {
      return NextResponse.json(
        { success: false, error: { message: perm.error || 'Administrator privileges required.' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        { success: false, error: { message: 'userId and newRole are required.' } },
        { status: 400 }
      );
    }

    const validRoles: Role[] = [Role.PATIENT, Role.CLINICIAN, Role.COORDINATOR, Role.ADMIN];
    if (!validRoles.includes(newRole as Role)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid role specified.' } },
        { status: 400 }
      );
    }

    // Update user role in PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as Role },
      select: { id: true, email: true, role: true },
    });

    // Record Audit Log for Governance
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        userRole: auth.role,
        action: AuditAction.ROLE_CHANGE,
        entityType: 'USER_MANAGEMENT',
        entityId: updatedUser.id,
        details: `Administrator updated user ${updatedUser.email} role to ${newRole}.`,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Admin Console',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
        message: `User role updated to ${newRole} successfully.`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Role change failed.' } },
      { status: 500 }
    );
  }
}
