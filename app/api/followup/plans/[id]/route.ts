import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { ApiResponse } from '@/lib/types/followup';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = store.getPlan(id);

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Plan ${id} not found.` },
        },
        { status: 404 }
      );
    }

    const patient = store.getPatient(plan.patientId);
    const risk = plan.riskAssessmentId ? store.getRiskAssessmentByPatient(plan.patientId) : undefined;
    const travel = plan.travelComparisonId ? store.getTravelComparisonByPatient(plan.patientId) : undefined;

    const response: ApiResponse = {
      success: true,
      data: {
        ...plan,
        patient,
        risk,
        travel,
      },
      meta: { timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
