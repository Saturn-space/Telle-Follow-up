import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';
import { evaluateAndPersistRecoveryRisk } from '@/lib/server/risk-persistence';

export const runtime = 'nodejs';

const recoveryLogSchema = z.object({
  postOpDay: z.number().int().min(0).max(3650).optional(),
  systolicBP: z.number().int().min(40).max(280).optional(),
  diastolicBP: z.number().int().min(20).max(180).optional(),
  heartRate: z.number().int().min(25).max(250).optional(),
  temperatureC: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().int().min(4).max(80).optional(),
  oxygenSat: z.number().min(40).max(100).optional(),
  painScore: z.number().int().min(0).max(10),
  mobilityLevel: z.string().trim().max(80).optional(),
  symptoms: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  woundDescription: z.string().trim().max(4000).optional(),
  drainOutputMl: z.number().int().min(0).max(10000).optional(),
});

function accessResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const context = await getVerifiedAuthContext(request);
    const { patientId } = await params;
    await requirePatientAccess(context, patientId);
    const limitParam = Number(new URL(request.url).searchParams.get('limit') || 50);
    const take = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
    const recoveryLogs = await prisma.recoveryLog.findMany({
      where: { patientId },
      orderBy: { logTimestamp: 'desc' },
      take,
      include: { riskAssessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return NextResponse.json({ success: true, data: recoveryLogs, meta: { count: recoveryLogs.length, limit: take } });
  } catch (error) {
    const response = accessResponse(error);
    if (response) return response;
    console.error('[recovery-logs] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Recovery history could not be loaded.' } }, { status: 503 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const context = await getVerifiedAuthContext(request);
  try {
    requireRoles(context, ['PATIENT']);
    const { patientId } = await params;
    await requirePatientAccess(context, patientId);
    const parsed = recoveryLogSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Check the recovery observations and try again.', details: parsed.error.flatten() } }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { surgeries: { orderBy: { surgeryDate: 'desc' }, take: 1 } },
    });
    if (!patient) return NextResponse.json({ success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'Patient record was not found.' } }, { status: 404 });

    const surgery = patient.surgeries[0];
    const input = parsed.data;
    if (!surgery && input.postOpDay === undefined) {
      return NextResponse.json({ success: false, error: { code: 'POST_OP_DAY_REQUIRED', message: 'Add a surgery record or enter the current post-operative day before submitting.' } }, { status: 409 });
    }
    const derivedPostOpDay = surgery
      ? Math.max(0, Math.floor((Date.now() - surgery.surgeryDate.getTime()) / 86_400_000))
      : input.postOpDay!;

    const recoveryLog = await prisma.recoveryLog.create({
      data: {
        patientId,
        surgeryRecordId: surgery?.id,
        postOpDay: derivedPostOpDay,
        logTimestamp: new Date(),
        systolicBP: input.systolicBP,
        diastolicBP: input.diastolicBP,
        heartRate: input.heartRate,
        temperatureC: input.temperatureC,
        respiratoryRate: input.respiratoryRate,
        oxygenSat: input.oxygenSat,
        painScore: input.painScore,
        mobilityLevel: input.mobilityLevel,
        symptoms: input.symptoms,
        woundDescription: input.woundDescription,
        drainOutputMl: input.drainOutputMl,
        isVerified: false,
      },
    });

    let riskAssessment = null;
    let riskAssessmentStatus: 'SAVED' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let riskAssessmentMessage: string | undefined = surgery
      ? undefined
      : 'A clinician review is required because the patient has no linked surgery record.';
    if (surgery) {
      try {
        riskAssessment = await evaluateAndPersistRecoveryRisk(recoveryLog.id);
        riskAssessmentStatus = 'SAVED';
      } catch (error) {
        console.error('[recovery-logs] Risk evaluation unavailable after recovery save:', error instanceof Error ? error.name : 'unknown error');
        riskAssessmentMessage = 'The recovery entry was saved. Risk assessment is unavailable and requires clinician review.';
      }
    }

    return NextResponse.json({
      success: true,
      data: { recoveryLog, riskAssessment, riskAssessmentStatus, riskAssessmentMessage },
    }, { status: 201 });
  } catch (error) {
    const response = accessResponse(error);
    if (response) return response;
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[recovery-logs] Save failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Recovery entry could not be saved.' } }, { status: 503 });
  }
}
