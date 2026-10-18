import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@/generated/prisma';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireRoles } from '@/lib/server/db-access';

const decisionSchema = z.object({ decision: z.enum(['APPROVE', 'REJECT', 'HOLD', 'RESUME']) }).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['ADMIN']);
    const { applicationId } = await params;
    const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose approve or reject.' } }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.clinicianRegistrationApplication.findUnique({ where: { id: applicationId } });
      if (!application) throw new AccessError('Clinician application was not found.', 404);
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ['APPROVE', 'REJECT', 'HOLD'],
        ON_HOLD: ['APPROVE', 'REJECT', 'RESUME'],
      };
      if (!allowedTransitions[application.status]?.includes(parsed.data.decision)) {
        throw new AccessError('This application cannot be changed from its current status.', 409);
      }

      let userId: string | null = null;
      if (parsed.data.decision === 'APPROVE') {
        if (!application.passwordHash) throw new AccessError('The application has no valid credential hash.', 409);
        const existingUser = await tx.user.findUnique({ where: { email: application.email }, select: { id: true } });
        if (existingUser) throw new AccessError('An account with this email already exists. Resolve the account before approving.', 409);
        const user = await tx.user.create({
          data: { email: application.email, passwordHash: application.passwordHash, role: Role.CLINICIAN },
          select: { id: true, email: true, role: true },
        });
        userId = user.id;
      }

      const updated = await tx.clinicianRegistrationApplication.update({
        where: { id: applicationId },
        data: {
          status: parsed.data.decision === 'APPROVE' ? 'APPROVED'
            : parsed.data.decision === 'REJECT' ? 'REJECTED'
              : parsed.data.decision === 'HOLD' ? 'ON_HOLD' : 'PENDING',
          passwordHash: ['APPROVE', 'REJECT'].includes(parsed.data.decision) ? null : undefined,
          reviewedById: ['APPROVE', 'REJECT'].includes(parsed.data.decision) ? context.userId : undefined,
          reviewedAt: ['APPROVE', 'REJECT'].includes(parsed.data.decision) ? new Date() : undefined,
          userId,
        },
        select: { id: true, fullName: true, email: true, specialty: true, status: true, userId: true },
      });
      await tx.auditLog.create({
        data: {
          userId: context.userId,
          userEmail: context.email,
          userRole: context.role,
          action: 'ROLE_CHANGE',
          entityType: 'CLINICIAN_REGISTRATION_APPLICATION',
          entityId: application.id,
          details: `Administrator ${parsed.data.decision.toLowerCase()} clinician registration for ${application.email}.`,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      });
      return updated;
    });

    const message = {
      APPROVE: 'Clinician account approved and activated.',
      REJECT: 'Clinician application rejected.',
      HOLD: 'Clinician application placed on hold.',
      RESUME: 'Clinician application returned to the pending queue.',
    }[parsed.data.decision];
    return NextResponse.json({ success: true, data: { application: result }, message });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : error.status === 404 ? 'NOT_FOUND' : 'CONFLICT', message: error.message } }, { status: error.status });
    }
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'P2002') {
      return NextResponse.json({ success: false, error: { code: 'ACCOUNT_EXISTS', message: 'A clinician account with this email already exists.' } }, { status: 409 });
    }
    console.error('[admin/clinician-applications] Review failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'REVIEW_UNAVAILABLE', message: 'The clinician application could not be reviewed.' } }, { status: 503 });
  }
}
