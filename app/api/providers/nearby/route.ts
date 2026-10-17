// ============================================================================
// API ROUTE: /api/providers/nearby
// GET: Spatial radius proximity search around coordinates
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { providerRepository } from '@/lib/db/provider-repository';
import { ServiceCategory } from '@/lib/types/provider';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const latParam = searchParams.get('lat') || searchParams.get('latitude');
    const lngParam = searchParams.get('lng') || searchParams.get('longitude');
    const radiusParam = searchParams.get('radiusKm') || searchParams.get('radius') || '25';
    const servicesParam = searchParams.get('services');
    const limitParam = searchParams.get('limit') || '10';

    if (!latParam || !lngParam) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_COORDINATES',
            message: 'Both latitude (lat) and longitude (lng) parameters are required for nearby search.',
          },
        },
        { status: 400 }
      );
    }

    const latitude = parseFloat(latParam);
    const longitude = parseFloat(lngParam);
    const radiusKm = parseFloat(radiusParam);
    const limit = Math.min(50, Math.max(1, parseInt(limitParam, 10)));

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LATITUDE',
            message: 'Latitude must be a valid number between -90 and 90.',
          },
        },
        { status: 400 }
      );
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LONGITUDE',
            message: 'Longitude must be a valid number between -180 and 180.',
          },
        },
        { status: 400 }
      );
    }

    if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_RADIUS',
            message: 'radiusKm must be a positive number between 1 and 500 km.',
          },
        },
        { status: 400 }
      );
    }

    const services = servicesParam
      ? (servicesParam.split(',').map((s) => s.trim().toUpperCase()) as ServiceCategory[])
      : undefined;

    const result = providerRepository.searchFacilities({
      latitude,
      longitude,
      radiusKm,
      services,
      limit,
      sortBy: 'distance',
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        ...result.meta,
        center: { latitude, longitude },
        radiusKm,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NEARBY_SEARCH_FAILED',
          message: 'Failed to execute proximity search.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
