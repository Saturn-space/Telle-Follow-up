import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { ApiResponse } from '@/lib/types/followup';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || 'pat-101';

    const patient = store.getPatient(patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Patient ${patientId} not found.` } },
        { status: 404 }
      );
    }

    const risk = store.getRiskAssessmentByPatient(patientId);
    const travel = store.getTravelComparisonByPatient(patientId);
    const allProviders = store.getAllProviders();
    const plans = store.getAllPlans(patientId);
    const appointments = store.getAppointmentsByPatient(patientId);
    const allPatients = store.getAllPatients();

    const response: ApiResponse = {
      success: true,
      data: {
        allPatients,
        activePatient: patient,
        member1_recovery: {
          patient,
          status: 'SYNTHETIC_INGESTION_READY',
        },
        member2_risk: {
          assessment: risk,
          isHighRisk: risk?.riskTier === 'HIGH',
        },
        member3_providers: {
          localProviders: allProviders,
        },
        member4_travel: {
          comparison: travel,
          isEscalated: travel?.isEscalated,
        },
        member5_orchestration: {
          plans,
          appointments,
        },
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
