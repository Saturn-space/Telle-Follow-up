import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess } from '@/lib/server/db-access';
import { mapRiskAssessment } from '@/lib/server/risk-persistence';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const context = await getVerifiedAuthContext(request);
    const { patientId } = await params;
    await requirePatientAccess(context, patientId);
    const parsedLimit = Number(new URL(request.url).searchParams.get('limit') || 50);
    const take = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
    const rows = await prisma.riskAssessment.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { contributingFactors: true, clinicalAlerts: true, reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
    });
    return NextResponse.json({ success: true, data: rows.map(mapRiskAssessment), meta: { count: rows.length, limit: take } });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    }
    console.error('[risk-assessments] History query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Assessment history could not be loaded.' } }, { status: 503 });
  }
}
