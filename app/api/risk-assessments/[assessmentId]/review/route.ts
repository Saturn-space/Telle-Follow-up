import { NextRequest, NextResponse } from 'next/server';
import { riskStore } from '@/lib/risk/store';
import { ClinicianReviewSubmission, ReviewStatus, RiskLevel } from '@/lib/risk/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  const { assessmentId } = await params;

  try {
    const body = await req.json();
    const { decision, reviewerId, reviewerName, reviewerRole, overrideLevel, clinicalNotes, escalateToOperatingSurgeon } = body;

    // Validate required review payload
    if (!decision || !['ACCEPTED', 'OVERRIDDEN', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DECISION',
            message: 'decision must be one of ACCEPTED, OVERRIDDEN, REJECTED.',
          },
          data: null,
        },
        { status: 400 }
      );
    }

    const callerHeaderRole = req.headers.get('x-user-role');
    if (callerHeaderRole && !['SURGEON', 'LOCAL_DOCTOR', 'COORDINATOR'].includes(callerHeaderRole.toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN_ROLE',
            message: `Caller role "${callerHeaderRole}" is unauthorized to submit clinical reviews. Only clinical personnel may review assessments.`,
          },
          data: null,
        },
        { status: 403 }
      );
    }

    if (!reviewerName || !reviewerRole) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REVIEWER',
            message: 'reviewerName and reviewerRole (SURGEON, LOCAL_DOCTOR, COORDINATOR) are required.',
          },
          data: null,
        },
        { status: 400 }
      );
    }

    const ALLOWED_REVIEWER_ROLES = ['SURGEON', 'LOCAL_DOCTOR', 'COORDINATOR'];
    if (!ALLOWED_REVIEWER_ROLES.includes(String(reviewerRole).toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN_ROLE',
            message: `Role "${reviewerRole}" is unauthorized to submit clinical reviews. Permitted roles: SURGEON, LOCAL_DOCTOR, COORDINATOR.`,
          },
          data: null,
        },
        { status: 403 }
      );
    }

    if (decision === 'OVERRIDDEN' && !overrideLevel) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OVERRIDE_LEVEL_REQUIRED',
            message: 'overrideLevel is required when decision is OVERRIDDEN.',
          },
          data: null,
        },
        { status: 400 }
      );
    }

    const submission: ClinicianReviewSubmission = {
      decision: decision as ReviewStatus,
      reviewerId: reviewerId || 'rev_doc_01',
      reviewerName,
      reviewerRole: reviewerRole as 'SURGEON' | 'LOCAL_DOCTOR' | 'COORDINATOR',
      overrideLevel: overrideLevel as RiskLevel | undefined,
      clinicalNotes: clinicalNotes || 'Standard clinical review completed.',
      escalateToOperatingSurgeon: !!escalateToOperatingSurgeon,
    };

    const updatedAssessment = riskStore.applyClinicianReview(assessmentId, submission);

    return NextResponse.json({
      success: true,
      data: updatedAssessment,
      error: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REVIEW_FAILED',
          message,
        },
        data: null,
      },
      { status }
    );
  }
}
