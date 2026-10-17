import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { AuthGuard } from '@/lib/auth/rbac';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const auth = AuthGuard.getAuthContext(req);

    const patient = db.getPatientById(id);
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Patient with ID '${id}' was not found.`,
          },
        },
        { status: 404 }
      );
    }

    const document = db.getDocumentById(docId);
    if (!document || document.patientId !== id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Document with ID '${docId}' not found for this patient.`,
          },
        },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { isVerified, correctedText, correctionNotes, reviewedByUserId } = body;

    if (typeof isVerified !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'isVerified boolean field is required.',
          },
        },
        { status: 400 }
      );
    }

    // Security check: Only clinical or administrative roles can verify records into the clinical record
    if (isVerified && !AuthGuard.canVerifyClinicalRecord(auth)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Patients cannot self-verify diagnostic medical records. Clinician or supervisor review required.',
          },
        },
        { status: 403 }
      );
    }

    const reviewerId = reviewedByUserId || auth.userId || 'usr-clinician-reviewer';

    const updatedExtraction = db.updateOcrReview(
      docId,
      reviewerId,
      isVerified,
      correctedText,
      correctionNotes
    );

    return NextResponse.json({
      success: true,
      data: updatedExtraction,
      message: isVerified
        ? 'OCR extraction reviewed, corrected, and verified into medical record.'
        : 'OCR review updated (unverified state preserved).',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error reviewing OCR document',
        },
      },
      { status: 500 }
    );
  }
}
