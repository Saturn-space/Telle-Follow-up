// app/api/v1/patients/route.ts
// Handles Patient Registration and Directory Listing with strict server-side validation.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { AuthGuard } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const patients = db.getPatients(search);

    return NextResponse.json({
      success: true,
      data: {
        total: patients.length,
        patients,
      },
      message: 'Patients retrieved successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to query patients',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = AuthGuard.getAuthContext(req);

    // Only CLINICIAN, COORDINATOR, and ADMIN can register a new patient
    if (auth.role === 'PATIENT') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Patients cannot register other patient records. Care coordinator or clinician role required.',
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      fullName,
      dateOfBirth,
      gender,
      phone,
      homeAddress,
      homeCity,
      homeState,
      homeZip,
      emergencyContact,
      mrn,
    } = body;

    // Strict validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Full name is required and must be at least 2 characters.',
          },
        },
        { status: 400 }
      );
    }

    if (!dateOfBirth || isNaN(Date.parse(dateOfBirth))) {
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

    if (new Date(dateOfBirth).getTime() > Date.now()) {
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

    if (!homeCity || !homeState || !homeZip) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Complete home location (City, State, Zip) is required for follow-up and travel coordination.',
          },
        },
        { status: 400 }
      );
    }

    if (homeState.trim().length !== 2) {
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

    if (!/^\d{5}(-\d{4})?$/.test(homeZip.trim())) {
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

    if (phone && (phone.length > 30 || !/^[\d\s\+\-\(\)\.]+$/.test(phone.trim()))) {
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

    // Auto-generate or format MRN
    let finalMrn = mrn ? mrn.trim() : null;
    if (!finalMrn) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      finalMrn = `TFO-2026-${randomSuffix}`;
    }

    // Check MRN uniqueness
    const existing = db.getPatientByMrn(finalMrn);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_MRN',
            message: `Medical Record Number '${finalMrn}' is already assigned to another patient.`,
          },
        },
        { status: 409 }
      );
    }

    const patient = db.createPatient({
      mrn: finalMrn,
      fullName: fullName.trim(),
      dateOfBirth: new Date(dateOfBirth).toISOString(),
      gender: gender || 'Unspecified',
      phone: phone || '',
      homeAddress: homeAddress || '',
      homeCity: homeCity.trim(),
      homeState: homeState.trim().toUpperCase(),
      homeZip: homeZip.trim(),
      emergencyContact: emergencyContact || null,
    });

    return NextResponse.json(
      {
        success: true,
        data: patient,
        message: 'Patient registered successfully. Ready for surgical profile association.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to register patient',
        },
      },
      { status: 500 }
    );
  }
}
