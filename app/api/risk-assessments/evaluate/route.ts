import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';
import { evaluateAndPersistRecoveryRisk } from '@/lib/server/risk-persistence';

export const runtime = 'nodejs';

const requestSchema = z.object({ patientId: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['CLINICIAN', 'COORDINATOR', 'ADMIN']);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A patientId is required.' } }, { status: 400 });
    }

    await requirePatientAccess(context, parsed.data.patientId);
    const latestLog = await prisma.recoveryLog.findFirst({
      where: { patientId: parsed.data.patientId },
      orderBy: { logTimestamp: 'desc' },
      select: { id: true },
    });
    if (!latestLog) {
      return NextResponse.json({ success: false, error: { code: 'RECOVERY_DATA_UNAVAILABLE', message: 'No saved recovery entry is available for assessment.' } }, { status: 409 });
    }

    const assessment = await evaluateAndPersistRecoveryRisk(latestLog.id);
    return NextResponse.json({ success: true, data: assessment, meta: { timestamp: new Date().toISOString(), engine: assessment.engine, engineVersion: assessment.engineVersion } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes('no surgery record')) {
      return NextResponse.json({ success: false, error: { code: 'RISK_DATA_UNAVAILABLE', message: error.message } }, { status: 409 });
    }
    console.error('[risk-assessments/evaluate] Evaluation failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'EVALUATION_UNAVAILABLE', message: 'The assessment could not be completed. Review the saved recovery record and retry.' } }, { status: 503 });
  }
}
