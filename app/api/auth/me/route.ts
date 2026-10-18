import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(req);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: auth.error || 'Authentication session is required.',
          },
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        patientProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found.',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.patientProfile?.fullName || user.email.split('@')[0],
          patientId: user.patientProfile?.id,
          mrn: user.patientProfile?.mrn,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    console.error('[API /api/auth/me] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to retrieve active session.',
        },
      },
      { status: 500 }
    );
  }
}
