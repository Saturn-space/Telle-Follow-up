import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { UserRole } from '@/lib/types/patient';
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
            message: 'Access denied. You are not authorized to view recovery observations for this patient.',
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

    const observations = db.getRecoveryEntriesByPatientId(id);

    return NextResponse.json({
      success: true,
      data: {
        patientId: id,
        total: observations.length,
        observations,
      },
      message: 'Recovery observations retrieved successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error retrieving recovery observations',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
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
            message: 'Access denied. You cannot record recovery observations for another patient.',
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

    const body = await req.json();
    const {
      painScore,
      mobilityStatus,
      woundCondition,
      symptoms,
      patientNotes,
      reportedByRole,
      recordedAt,
      vitals,
    } = body;

    // Strict validation of pain score (NRS 0 to 10 scale)
    if (painScore === undefined || typeof painScore !== 'number' || painScore < 0 || painScore > 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Pain score must be a number between 0 (no pain) and 10 (worst pain imaginable).',
          },
        },
        { status: 400 }
      );
    }

    if (!mobilityStatus || typeof mobilityStatus !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Mobility status is required (e.g., Independent, Assisted, Bedbound).',
          },
        },
        { status: 400 }
      );
    }

    if (recordedAt) {
      if (isNaN(Date.parse(recordedAt))) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid ISO format for recordedAt timestamp.',
            },
          },
          { status: 400 }
        );
      }

      // Reject future observations with 1-minute drift tolerance
      if (new Date(recordedAt).getTime() > Date.now() + 60000) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Recovery observation timestamp cannot be in the future.',
            },
          },
          { status: 400 }
        );
      }
    }

    if (symptoms && (!Array.isArray(symptoms) || symptoms.length > 30)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Symptoms list must be an array and cannot exceed 30 items.',
          },
        },
        { status: 400 }
      );
    }

    if (patientNotes && typeof patientNotes === 'string' && patientNotes.length > 3000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Patient recovery notes cannot exceed 3000 characters.',
          },
        },
        { status: 400 }
      );
    }

    if (!woundCondition || typeof woundCondition !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Wound condition description is required.',
          },
        },
        { status: 400 }
      );
    }

    // Validate physiological vital limits if provided
    if (vitals) {
      if (vitals.temperatureC !== undefined && vitals.temperatureC !== null) {
        if (typeof vitals.temperatureC !== 'number' || vitals.temperatureC < 33 || vitals.temperatureC > 44) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Body temperature (°C) must be within physiological range (33.0 - 44.0 °C).',
              },
            },
            { status: 400 }
          );
        }
      }

      if (vitals.heartRateBpm !== undefined && vitals.heartRateBpm !== null) {
        if (typeof vitals.heartRateBpm !== 'number' || vitals.heartRateBpm < 30 || vitals.heartRateBpm > 240) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Heart rate must be within physiological range (30 - 240 bpm).',
              },
            },
            { status: 400 }
          );
        }
      }

      if (vitals.systolicBp !== undefined && vitals.systolicBp !== null) {
        if (typeof vitals.systolicBp !== 'number' || vitals.systolicBp < 50 || vitals.systolicBp > 300) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Systolic blood pressure must be within physiological range (50 - 300 mmHg).',
              },
            },
            { status: 400 }
          );
        }
      }

      if (vitals.diastolicBp !== undefined && vitals.diastolicBp !== null) {
        if (typeof vitals.diastolicBp !== 'number' || vitals.diastolicBp < 30 || vitals.diastolicBp > 200) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Diastolic blood pressure must be within physiological range (30 - 200 mmHg).',
              },
            },
            { status: 400 }
          );
        }
      }

      // Hemodynamic consistency
      if (
        vitals.systolicBp !== undefined &&
        vitals.systolicBp !== null &&
        vitals.diastolicBp !== undefined &&
        vitals.diastolicBp !== null
      ) {
        if (vitals.systolicBp <= vitals.diastolicBp) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Systolic blood pressure must be greater than diastolic blood pressure.',
              },
            },
            { status: 400 }
          );
        }
      }

      if (vitals.drainOutputMl !== undefined && vitals.drainOutputMl !== null) {
        if (typeof vitals.drainOutputMl !== 'number' || vitals.drainOutputMl < 0) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Surgical drain output cannot be negative.',
              },
            },
            { status: 400 }
          );
        }
      }
    }

    const entry = db.createRecoveryEntry(
      {
        patientId: id,
        recordedAt: recordedAt && !isNaN(Date.parse(recordedAt)) ? new Date(recordedAt).toISOString() : new Date().toISOString(),
        painScore: Math.round(painScore),
        mobilityStatus: mobilityStatus.trim(),
        woundCondition: woundCondition.trim(),
        symptoms: Array.isArray(symptoms) ? symptoms.map((s: unknown) => String(s).trim()) : [],
        patientNotes: patientNotes ? String(patientNotes).trim() : null,
        reportedByRole: (reportedByRole as UserRole) || 'PATIENT',
      },
      vitals
    );

    return NextResponse.json(
      {
        success: true,
        data: entry,
        message: 'Recovery observation and vitals recorded successfully.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error recording recovery observation',
        },
      },
      { status: 500 }
    );
  }
}
