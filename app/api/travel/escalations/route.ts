import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess } from '@/lib/server/db-access';

const requestSchema = z.object({ comparisonId: z.string().min(1).max(128), patientId: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(request);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A comparisonId and patientId are required.' } }, { status: 400 });
    const comparison = await prisma.travelComparison.findUnique({ where: { id: parsed.data.comparisonId }, include: { riskAssessment: { include: { clinicalAlerts: { select: { severity: true, headline: true } } } }, recommendedFacility: { select: { id: true, name: true, phone: true } } } });
    if (!comparison || comparison.patientId !== parsed.data.patientId) throw new AccessError('Travel comparison was not found.', 404);
    await requirePatientAccess(auth, comparison.patientId);
    if (!comparison.isEscalated || !comparison.riskAssessment) return NextResponse.json({ success: false, error: { code: 'ESCALATION_NOT_ACTIVE', message: 'This persisted comparison does not represent a clinical escalation.' } }, { status: 409 });
    const risk = comparison.riskAssessment;
    const level = risk.overrideLevel || risk.riskLevel;
    return NextResponse.json({
      success: true,
      data: {
        eventId: comparison.id,
        comparisonId: comparison.id,
        patientId: comparison.patientId,
        triggeredAt: comparison.createdAt.toISOString(),
        reason: risk.escalationReason || 'Elevated clinician-reviewed risk requires immediate assessment.',
        urgencyLevel: level,
        redFlags: risk.clinicalAlerts.filter((alert) => ['HIGH', 'CRITICAL'].includes(alert.severity.toUpperCase())).map((alert) => alert.headline),
        recommendedAction: 'Contact local emergency services or proceed to emergency care immediately. Do not delay for routine travel coordination.',
        nearestEmergencyFacility: comparison.recommendedFacility ? { id: comparison.recommendedFacility.id, name: comparison.recommendedFacility.name, phone: comparison.recommendedFacility.phone || '' } : undefined,
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[travel/escalations] Read failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'ESCALATION_UNAVAILABLE', message: 'Escalation information could not be loaded.' } }, { status: 503 });
  }
}
