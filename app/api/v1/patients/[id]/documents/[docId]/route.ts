// app/api/v1/patients/[id]/documents/[docId]/route.ts
// Handles retrieval and authorized deletion of specific medical documents.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { AuthGuard } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const auth = AuthGuard.getAuthContext(req);

    if (!AuthGuard.canAccessPatient(auth, id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You are not authorized to view documents for this patient.',
          },
        },
        { status: 403 }
      );
    }

    const doc = db.getDocumentById(docId);
    if (!doc || doc.patientId !== id) {
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

    return NextResponse.json({
      success: true,
      data: doc,
      message: 'Document retrieved successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error retrieving document',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const auth = AuthGuard.getAuthContext(req);

    // Only clinical staff or administrative coordinators can delete/purge medical records
    if (!['CLINICIAN', 'ADMIN', 'COORDINATOR'].includes(auth.role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Patients cannot purge diagnostic medical documents. Staff authorization required.',
          },
        },
        { status: 403 }
      );
    }

    if (!AuthGuard.canAccessPatient(auth, id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You are not authorized to manage documents for this patient.',
          },
        },
        { status: 403 }
      );
    }

    const success = db.deleteDocument(id, docId);
    if (!success) {
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

    return NextResponse.json({
      success: true,
      data: { documentId: docId, patientId: id },
      message: 'Medical document purged and associated OCR extraction removed successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error deleting document',
        },
      },
      { status: 500 }
    );
  }
}
