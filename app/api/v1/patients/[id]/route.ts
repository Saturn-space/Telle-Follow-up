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

    // Disallow modifying synthetic MRN, account association, or immutable creation timestamps
    delete body.id;
    delete body.mrn;
    delete body.createdAt;
    delete body.userId;

    // Field-level validation on updates
    if (body.fullName !== undefined) {
      if (typeof body.fullName !== 'string' || body.fullName.trim().length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Full name must be at least 2 characters.',
            },
          },
          { status: 400 }
        );
      }
      body.fullName = body.fullName.trim();
    }

    if (body.dateOfBirth !== undefined) {
      if (isNaN(Date.parse(body.dateOfBirth))) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Valid date of birth in ISO format is required.',
            },
          },
          { status: 400 }
        );
      }
      if (new Date(body.dateOfBirth).getTime() > Date.now()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Date of birth cannot be in the future.',
            },
          },
          { status: 400 }
        );
      }
      body.dateOfBirth = new Date(body.dateOfBirth).toISOString();
    }

    if (body.homeState !== undefined) {
      if (typeof body.homeState !== 'string' || body.homeState.trim().length !== 2) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'State must be a valid 2-letter postal abbreviation (e.g. IL, CA, NY).',
            },
          },
          { status: 400 }
        );
      }
      body.homeState = body.homeState.trim().toUpperCase();
    }

    if (body.homeZip !== undefined) {
      if (typeof body.homeZip !== 'string' || !/^\d{5}(-\d{4})?$/.test(body.homeZip.trim())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'ZIP code must be a valid 5-digit postal code (e.g. 62704).',
            },
          },
          { status: 400 }
        );
      }
      body.homeZip = body.homeZip.trim();
    }

    if (body.phone !== undefined && body.phone !== null) {
      if (typeof body.phone !== 'string' || body.phone.length > 30 || !/^[\d\s\+\-\(\)\.]+$/.test(body.phone.trim())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Phone number format is invalid.',
            },
          },
          { status: 400 }
        );
      }
      body.phone = body.phone.trim();
    }

    const updated = db.updatePatient(id, body);

    if (!updated) {
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
