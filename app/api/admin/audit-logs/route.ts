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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await prisma.auditLog.findMany({
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true, role: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { logs },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch audit logs.' } },
      { status: 500 }
    );
  }
}
