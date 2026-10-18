import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';
import { mapRiskAssessment } from '@/lib/server/risk-persistence';

export const runtime = 'nodejs';

const reviewSchema = z.object({
  decision: z.enum(['ACCEPTED', 'OVERRIDDEN', 'REJECTED']),
  overrideLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'INDETERMINATE']).optional(),
  clinicalNotes: z.string().trim().min(5).max(4000),
  escalateToOperatingSurgeon: z.boolean().optional(),
}).refine((value) => value.decision !== 'OVERRIDDEN' || value.overrideLevel !== undefined, {
  path: ['overrideLevel'],
  message: 'overrideLevel is required when overriding an assessment.',
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['CLINICIAN']);
    const { assessmentId } = await params;
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Review decision or clinical notes are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    }

    const assessment = await prisma.riskAssessment.findUnique({ where: { id: assessmentId }, select: { id: true, patientId: true, riskLevel: true } });
    if (!assessment) throw new AccessError('Assessment was not found.', 404);
    await requirePatientAccess(context, assessment.patientId);

    const decision = parsed.data.decision;
    const finalLevel = decision === 'OVERRIDDEN' ? parsed.data.overrideLevel! : assessment.riskLevel;
    const now = new Date();
    const clinician = await prisma.user.findUnique({ where: { id: context.userId }, select: { email: true } });
    if (!clinician) throw new AccessError('Clinician account was not found.', 401);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.clinicianReview.create({
        data: {
          assessmentId,
          reviewerId: context.userId,
          reviewerName: clinician.email,
          reviewerRole: 'CLINICIAN',
          decision,
          originalLevel: assessment.riskLevel,
          finalLevel,
          clinicalNotes: parsed.data.clinicalNotes,
          escalationRaised: Boolean(parsed.data.escalateToOperatingSurgeon),
          reviewedAt: now,
        },
      });

      await tx.riskAssessment.update({
        where: { id: assessmentId },
        data: {
          reviewStatus: decision,
          reviewedById: context.userId,
          reviewedByName: clinician.email,
          reviewedAt: now,
          clinicianNotes: parsed.data.clinicalNotes,
          overrideLevel: decision === 'OVERRIDDEN' ? parsed.data.overrideLevel : null,
          isEscalated: parsed.data.escalateToOperatingSurgeon ? true : undefined,
          escalationReason: parsed.data.escalateToOperatingSurgeon ? parsed.data.clinicalNotes : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          userEmail: clinician.email,
          userRole: context.role,
          action: 'CLINICAL_REVIEW',
          entityType: 'RISK_ASSESSMENT',
          entityId: assessmentId,
          details: `Clinical decision recorded: ${decision}.`,
        },
      });

      return tx.riskAssessment.findUniqueOrThrow({
        where: { id: assessmentId },
        include: { contributingFactors: true, clinicalAlerts: true, reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
      });
    });

    return NextResponse.json({ success: true, data: mapRiskAssessment(updated) });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    }
    console.error('[risk-assessments/review] Review failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'REVIEW_UNAVAILABLE', message: 'The clinical review could not be saved.' } }, { status: 503 });
  }
}
