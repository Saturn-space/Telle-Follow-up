// ============================================================================
// API ROUTE: /api/providers/[providerId]
// GET: Retrieve single facility profile, full services & verification records
// PATCH: Update facility information (Role: COORDINATOR or ADMIN)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { providerRepository } from '@/lib/db/provider-repository';

interface RouteParams {
  params: Promise<{
    providerId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { providerId } = await params;

    if (!providerId || providerId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Provider ID parameter is required.',
          },
        },
        { status: 400 }
      );
    }

    const facility = providerRepository.getFacilityById(providerId);

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FACILITY_NOT_FOUND',
            message: `No healthcare facility found matching ID: ${providerId}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: facility,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FACILITY_FETCH_FAILED',
          message: 'Failed to retrieve facility details.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { providerId } = await params;
    const roleHeader = request.headers.get('x-user-role');
    const isAuthorized = roleHeader === 'COORDINATOR' || roleHeader === 'ADMIN';

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: Only authorized clinical coordinators and administrators may update healthcare facilities.',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Prevent direct modification of verificationStatus via PATCH — must use formal /verification endpoint
    if (body.verificationStatus) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Verification status cannot be changed directly via PATCH. Use POST /api/providers/:id/verification with audit evidence.',
          },
        },
        { status: 400 }
      );
    }

    // Strip protected fields
    const { id: _id, createdAt: _created, updatedAt: _updated, verifications: _ver, services: _srv, ...sanitizedUpdates } = body;

    const updated = providerRepository.updateFacility(providerId, sanitizedUpdates);

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FACILITY_NOT_FOUND',
            message: `Cannot update: No healthcare facility found matching ID ${providerId}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      meta: { message: 'Facility updated successfully.' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FACILITY_UPDATE_FAILED',
          message: 'Failed to update facility record.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
