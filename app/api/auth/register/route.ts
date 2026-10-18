import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, signSessionToken } from '@/lib/server/auth-guard';

export const runtime = 'nodejs';

const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  gender: z.string().trim().max(40).optional(),
  age: z.coerce.number().int().min(0).max(125).optional(),
  contactPhone: z.string().trim().max(32).optional(),
  homeCity: z.string().trim().max(100).optional(),
  homeState: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    getJwtSecret();
    const parsed = registrationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email, name, and password of at least 8 characters.', details: parsed.error.flatten() },
      }, { status: 400 });
    }

    const input = parsed.data;
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        role: Role.PATIENT,
        patientProfile: {
          create: {
            mrn: `MRN-${randomUUID()}`,
            fullName: input.fullName || input.name || 'Patient User',
            gender: input.gender || 'Not Specified',
            age: input.age,
            contactPhone: input.contactPhone || undefined,
            homeCity: input.homeCity || undefined,
            homeState: input.homeState || undefined,
          },
        },
      },
      include: { patientProfile: { select: { id: true, mrn: true, fullName: true } } },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          action: 'REGISTER',
          entityType: 'USER',
          entityId: user.id,
          details: 'Patient self-registration completed.',
          ipAddress: req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        },
      });
    } catch {
      // Keep the account usable when the optional audit sink is unavailable.
    }

    const token = signSessionToken({ userId: user.id, email: user.email, role: user.role, patientId: user.patientProfile?.id });
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.patientProfile?.fullName,
          patientId: user.patientProfile?.id,
          mrn: user.patientProfile?.mrn,
        },
        redirectUrl: '/patients/dashboard',
      },
    }, { status: 201 });
    response.cookies.set('teleflow_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'P2002') {
      return NextResponse.json({ success: false, error: { code: 'USER_EXISTS', message: 'An account with this email address already exists.' } }, { status: 409 });
    }
    console.error('[auth/register] Registration service failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'REGISTRATION_UNAVAILABLE', message: 'Registration is temporarily unavailable. Check server configuration and database connectivity.' } }, { status: 503 });
  }
}
