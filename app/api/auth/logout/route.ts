import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@/generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthContext(req);

    if (auth.isAuthorized && auth.userId) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: auth.userId,
            userRole: auth.role,
            action: AuditAction.LOGOUT,
            entityType: 'AUTHENTICATION',
            entityId: auth.userId,
            details: 'User logged out and session cookie was invalidated.',
            ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
            userAgent: req.headers.get('user-agent') || 'Browser Client',
          },
        });
      } catch (e) {
        console.warn('[AuditLog] Logout audit recording failed:', e);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    // Clear session cookie
    response.cookies.set('teleflow_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { message: 'Logout failed.' } },
      { status: 500 }
    );
  }
}
