import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  medicalLicenseNumber: z.string().trim().min(3).max(100),
  specialty: z.string().trim().min(2).max(120),
  institution: z.string().trim().min(2).max(180),
  phone: z.string().trim().max(32).optional(),
  city: z.string().trim().max(100).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Enter your professional details and a password of at least 12 characters.', details: parsed.error.flatten() },
    }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: { code: 'ACCOUNT_EXISTS', message: 'An account with this email already exists. Sign in or contact the administrator.' } }, { status: 409 });
    }

    const existingApplication = await prisma.clinicianRegistrationApplication.findUnique({ where: { email } });
    if (existingApplication && existingApplication.status !== 'REJECTED') {
      return NextResponse.json({ success: false, error: { code: 'APPLICATION_EXISTS', message: 'An application for this email is already under review or approved.' } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const data = {
      fullName: parsed.data.fullName,
      email,
      passwordHash,
      medicalLicenseNumber: parsed.data.medicalLicenseNumber,
      specialty: parsed.data.specialty,
      institution: parsed.data.institution,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      status: 'PENDING' as const,
      reviewedById: null,
      reviewedAt: null,
      userId: null,
    };
    const application = existingApplication
      ? await prisma.clinicianRegistrationApplication.update({ where: { id: existingApplication.id }, data })
      : await prisma.clinicianRegistrationApplication.create({ data });

    return NextResponse.json({
      success: true,
      data: { application: { id: application.id, status: application.status, email: application.email } },
      message: 'Your clinician application was submitted. You can sign in after an administrator reviews your credentials.',
    }, { status: 202 });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'P2002') {
      return NextResponse.json({ success: false, error: { code: 'APPLICATION_EXISTS', message: 'An application or account with this email already exists.' } }, { status: 409 });
    }
    console.error('[auth/clinician-register] Application submission failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'REGISTRATION_UNAVAILABLE', message: 'Clinician registration is unavailable. Check database connectivity and migration status.' } }, { status: 503 });
  }
}
