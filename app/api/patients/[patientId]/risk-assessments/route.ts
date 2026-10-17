import { NextRequest, NextResponse } from 'next/server';
import { riskStore } from '@/lib/risk/store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  // Tenant / Cross-patient authorization check
  const callerRole = req.headers.get('x-user-role');
  const callerId = req.headers.get('x-user-id');

  if (callerRole && callerRole.toUpperCase() === 'PATIENT' && callerId && callerId !== patientId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CROSS_PATIENT_ACCESS_DENIED',
          message: 'Patients are strictly restricted to accessing their own recovery and risk assessments.',
        },
        data: null,
      },
      { status: 403 }
    );
  }

  const assessments = riskStore.listAssessmentsForPatient(patientId);

  return NextResponse.json({
    success: true,
    data: assessments,
    error: null,
    total: assessments.length,
  });
}
