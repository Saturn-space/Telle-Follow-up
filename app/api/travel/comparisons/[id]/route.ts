import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess } from '@/lib/server/db-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getVerifiedAuthContext(request);
    const { id } = await params;
    const comparison = await prisma.travelComparison.findUnique({ where: { id }, include: { patient: { select: { fullName: true, surgeries: { orderBy: { surgeryDate: 'desc' }, take: 1, select: { procedureName: true } } } }, riskAssessment: { include: { clinicalAlerts: { select: { severity: true, headline: true } } } } } });
    if (!comparison) throw new AccessError('Travel comparison was not found.', 404);
    await requirePatientAccess(auth, comparison.patientId);
    const snapshot = comparison.candidateOptionsJson && !Array.isArray(comparison.candidateOptionsJson) && typeof comparison.candidateOptionsJson === 'object'
      ? comparison.candidateOptionsJson as Record<string, unknown>
      : {};
    const data = { ...snapshot, comparisonId: comparison.id };
    return NextResponse.json({ success: true, data, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[travel/comparison] Read failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'COMPARISON_UNAVAILABLE', message: 'Travel comparison could not be loaded.' } }, { status: 503 });
  }
}
