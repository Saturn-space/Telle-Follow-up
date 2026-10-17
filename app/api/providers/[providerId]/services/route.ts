// ============================================================================
// API ROUTE: /api/providers/[providerId]/services
// GET: Retrieve listed recovery services and pricing for a specific provider
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
    const facility = providerRepository.getFacilityById(providerId);

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FACILITY_NOT_FOUND',
            message: `Facility with ID ${providerId} not found.`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: facility.services,
      meta: {
        facilityId: facility.id,
        facilityName: facility.name,
        servicesCount: facility.services.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICES_FETCH_FAILED',
          message: 'Failed to retrieve provider services.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
