import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, signSessionToken } from '@/lib/server/auth-guard';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    getJwtSecret();
    const rawBody = await req.text();
    let body: any = null;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_JSON', message: 'A valid JSON request body is required.' } }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: { code: 'INVALID_BODY', message: 'A JSON request body is required.' } }, { status: 400 });
    }

    const { email, password } = body as { email?: unknown; password?: unknown };
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_CREDENTIALS', message: 'Email and password are required.' } }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { patientProfile: { select: { id: true, mrn: true, fullName: true } } },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }, { status: 401 });
    }

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      patientId: user.patientProfile?.id,
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          action: 'LOGIN',
          entityType: 'AUTHENTICATION',
          entityId: user.id,
          details: 'User authenticated.',
          ipAddress: req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        },
      });
    } catch {
      // Authentication must remain available if optional audit logging is unavailable.
    }

    const redirectUrl =
      user.role === 'PATIENT' ? '/patients/dashboard' :
      user.role === 'CLINICIAN' ? '/clinician/dashboard' :
      user.role === 'COORDINATOR' ? '/coordinator/dashboard' :
      '/admin/dashboard';

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.patientProfile?.fullName || user.email.split('@')[0],
          patientId: user.patientProfile?.id,
          mrn: user.patientProfile?.mrn,
        },
        redirectUrl,
      },
    });
    response.cookies.set('teleflow_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('[auth/login] Authentication service failed:', error);
    return NextResponse.json({ success: false, error: { code: 'LOGIN_UNAVAILABLE', message: 'Sign-in is temporarily unavailable. Check server configuration and database connectivity.' } }, { status: 503 });
  }
}
