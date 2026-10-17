import { NextRequest, NextResponse } from 'next/server';
import { riskStore, SEEDED_PATIENT_CASES } from '@/lib/risk/store';
import { PatientRecoveryInput } from '@/lib/risk/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, recoveryInput, enableAiExplanation } = body;

    let targetInput: PatientRecoveryInput;

    if (recoveryInput) {
      targetInput = recoveryInput;
    } else if (patientId && SEEDED_PATIENT_CASES[patientId]) {
      targetInput = SEEDED_PATIENT_CASES[patientId];
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Must provide either a full recoveryInput object or a valid seeded patientId (e.g. pat_chole_01, pat_tka_02, pat_cabg_03).',
          },
          data: null,
        },
        { status: 400 }
      );
    }

    const assessment = await riskStore.createAssessment(targetInput, {
      enableAiExplanation: enableAiExplanation ?? true,
    });

    return NextResponse.json(
      {
        success: true,
        data: assessment,
        error: null,
        metadata: {
          timestamp: new Date().toISOString(),
          engine: assessment.engine,
          engineVersion: assessment.engineVersion,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EVALUATION_ERROR',
          message,
        },
        data: null,
      },
      { status: 422 }
    );
  }
}
