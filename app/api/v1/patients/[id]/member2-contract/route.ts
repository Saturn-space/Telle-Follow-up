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
            message: 'Access denied. You are not authorized to access clinical risk contract data for this patient.',
          },
        },
        { status: 403 }
      );
    }
    const contract = db.getMember2RiskContract(id);

    if (!contract) {
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
      data: contract,
      contractVersion: '1.0.0',
      message: 'Structured clinical recovery data formatted for Member 2 Risk Assessment engine.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error generating risk assessment contract payload',
        },
      },
      { status: 500 }
    );
  }
}
