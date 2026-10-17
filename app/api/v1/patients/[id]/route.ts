import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { AuthGuard } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = AuthGuard.getAuthContext(req);
    if (!AuthGuard.canAccessPatient(auth, id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You are not authorized to view this patient profile.',
          },
        },
        { status: 403 }
      );
    }

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

    const surgeries = db.getSurgeriesByPatientId(id);
    const recoveries = db.getRecoveryEntriesByPatientId(id);
    const documents = db.getDocumentsByPatientId(id);

    return NextResponse.json({
      success: true,
      data: {
        patient,
        surgery: surgeries.length > 0 ? surgeries[0] : null,
        recentRecovery: recoveries.length > 0 ? recoveries[0] : null,
        documentCount: documents.length,
      },
      message: 'Patient profile retrieved successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error retrieving patient',
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = AuthGuard.getAuthContext(req);
    if (!AuthGuard.canAccessPatient(auth, id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You are not authorized to update this patient profile.',
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const existing = db.getPatientById(id);
    if (!existing) {
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

    // Disallow modifying synthetic MRN or immutable creation timestamps
    delete body.id;
    delete body.mrn;
    delete body.createdAt;

    const updated = db.updatePatient(id, body);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Patient profile updated successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error updating patient',
        },
      },
      { status: 500 }
    );
  }
}
