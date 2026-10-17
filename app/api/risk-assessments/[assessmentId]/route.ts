import { NextRequest, NextResponse } from 'next/server';
import { riskStore } from '@/lib/risk/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  const { assessmentId } = await params;

  const assessment = riskStore.getAssessmentById(assessmentId);
  if (!assessment) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Risk assessment with ID "${assessmentId}" was not found.`,
        },
        data: null,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: assessment,
    error: null,
  });
}
