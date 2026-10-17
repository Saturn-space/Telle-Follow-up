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
            message: 'Access denied. You are not authorized to view surgical records for this patient.',
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

    return NextResponse.json({
      success: true,
      data: {
        patientId: id,
        surgeries,
      },
      message: 'Surgical records retrieved successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error retrieving surgery records',
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

    // Only clinical or coordinator staff can enter surgical and operative discharge data
    if (auth.role === 'PATIENT') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Patients cannot author surgical or operative discharge records. Clinician role required.',
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
      procedureName,
      surgicalSpecialty,
      hospitalName,
      hospitalCity,
      hospitalState,
      operatingSurgeon,
      surgeryDate,
      dischargeDate,
      dischargeCondition,
      woundCareInstructions,
      plannedFollowUpDate,
    } = body;

    // Validation
    if (
      !procedureName ||
      typeof procedureName !== 'string' ||
      procedureName.trim().length < 2 ||
      !hospitalName ||
      typeof hospitalName !== 'string' ||
      hospitalName.trim().length < 2 ||
      !operatingSurgeon ||
      typeof operatingSurgeon !== 'string' ||
      operatingSurgeon.trim().length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Procedure name, operating hospital name, and operating surgeon are required (minimum 2 characters).',
          },
        },
        { status: 400 }
      );
    }

    if (!surgeryDate || isNaN(Date.parse(surgeryDate))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid surgery date in ISO format is required.',
          },
        },
        { status: 400 }
      );
    }

    if (!dischargeDate || isNaN(Date.parse(dischargeDate))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid discharge date in ISO format is required.',
          },
        },
        { status: 400 }
      );
    }

    if (new Date(dischargeDate).getTime() < new Date(surgeryDate).getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Discharge date cannot precede surgery date.',
          },
        },
        { status: 400 }
      );
    }

    if (plannedFollowUpDate) {
      if (isNaN(Date.parse(plannedFollowUpDate))) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid planned follow-up date format.',
            },
          },
          { status: 400 }
        );
      }

      if (new Date(plannedFollowUpDate).getTime() < new Date(dischargeDate).getTime()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Planned follow-up date cannot precede hospital discharge date.',
            },
          },
          { status: 400 }
        );
      }
    }

    const surgery = db.createSurgery({
      patientId: id,
      procedureName: procedureName.trim(),
      surgicalSpecialty: surgicalSpecialty || 'General Surgery',
      hospitalName: hospitalName.trim(),
      hospitalCity: hospitalCity || 'Chicago',
      hospitalState: hospitalState || 'IL',
      operatingSurgeon: operatingSurgeon.trim(),
      surgeryDate: new Date(surgeryDate).toISOString(),
      dischargeDate: new Date(dischargeDate).toISOString(),
      dischargeCondition: dischargeCondition || 'Stable',
      woundCareInstructions: woundCareInstructions || 'Keep incision clean and dry.',
      plannedFollowUpDate: plannedFollowUpDate ? new Date(plannedFollowUpDate).toISOString() : null,
    });

    return NextResponse.json(
      {
        success: true,
        data: surgery,
        message: 'Surgery and discharge record created successfully.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error creating surgery record',
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

    // Only clinical or coordinator staff can modify surgical or discharge records
    if (auth.role === 'PATIENT') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Patients cannot modify operative or discharge records. Clinician role required.',
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
    const surgeryId = body.surgeryId || body.id;

    if (!surgeryId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Surgery record ID (surgeryId) is required for update.',
          },
        },
        { status: 400 }
      );
    }

    const existingSurgery = db.getSurgeryById(surgeryId);
    if (!existingSurgery || existingSurgery.patientId !== id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Surgery record '${surgeryId}' was not found for this patient.`,
          },
        },
        { status: 404 }
      );
    }

    // Prepare updates while preserving immutability of keys
    delete body.surgeryId;
    delete body.id;
    delete body.patientId;
    delete body.createdAt;

    // Validate date sequence if dates are updated
    const effSurgeryDate = body.surgeryDate ? new Date(body.surgeryDate) : new Date(existingSurgery.surgeryDate);
    const effDischargeDate = body.dischargeDate ? new Date(body.dischargeDate) : new Date(existingSurgery.dischargeDate);
    const effFollowUpDate = body.plannedFollowUpDate
      ? new Date(body.plannedFollowUpDate)
      : existingSurgery.plannedFollowUpDate
      ? new Date(existingSurgery.plannedFollowUpDate)
      : null;

    if (isNaN(effSurgeryDate.getTime()) || isNaN(effDischargeDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Surgery and discharge dates must be valid ISO timestamps.',
          },
        },
        { status: 400 }
      );
    }

    if (effDischargeDate.getTime() < effSurgeryDate.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Discharge date cannot precede surgery date.',
          },
        },
        { status: 400 }
      );
    }

    if (effFollowUpDate && effFollowUpDate.getTime() < effDischargeDate.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Planned follow-up date cannot precede hospital discharge date.',
          },
        },
        { status: 400 }
      );
    }

    const updated = db.updateSurgery(surgeryId, body);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Surgical and discharge record updated successfully without modifying unrelated records.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error updating surgery record',
        },
      },
      { status: 500 }
    );
  }
}
