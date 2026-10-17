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
            message: 'Access denied. You are not authorized to view this recovery timeline.',
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

    const timeline = db.getTimelineByPatientId(id);

    return NextResponse.json({
      success: true,
      data: {
        patientId: id,
        patientName: patient.fullName,
        mrn: patient.mrn,
        totalEvents: timeline.length,
        timeline,
      },
      message: 'Recovery timeline aggregated successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error retrieving recovery timeline',
        },
      },
      { status: 500 }
    );
  }
}
