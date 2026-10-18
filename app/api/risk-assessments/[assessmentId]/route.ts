import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess } from '@/lib/server/db-access';
import { mapRiskAssessment } from '@/lib/server/risk-persistence';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const context = await getVerifiedAuthContext(request);
    if (!context.isAuthorized) throw new AccessError('A valid session is required.', 401);
    const { assessmentId } = await params;
    const row = await prisma.riskAssessment.findUnique({
      where: { id: assessmentId },
      include: { contributingFactors: true, clinicalAlerts: true, reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
    });
    if (!row) throw new AccessError('Assessment was not found.', 404);
    await requirePatientAccess(context, row.patientId);
    return NextResponse.json({ success: true, data: mapRiskAssessment(row) });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    }
    console.error('[risk-assessments/:id] Fetch failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'The assessment could not be loaded.' } }, { status: 503 });
  }
}
