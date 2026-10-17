// ============================================================================
// API ROUTE: /api/providers (HARDENED - PHASE 3)
// GET: Search, filter, and paginate healthcare providers with strict validation
// POST: Register a new facility (Strict Role Check: COORDINATOR or ADMIN)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { providerRepository } from '@/lib/db/provider-repository';
import {
  FacilityType,
  ServiceCategory,
  VerificationStatus,
} from '@/lib/types/provider';

const VALID_FACILITY_TYPES: FacilityType[] = [
  'HOSPITAL',
  'CLINIC',
  'DIAGNOSTIC_CENTER',
  'WOUND_CARE_CENTER',
  'SURGICAL_REHAB',
];

const VALID_SERVICES: ServiceCategory[] = [
  'WOUND_CARE',
  'SUTURE_REMOVAL',
  'DRAIN_MANAGEMENT',
  'POST_OP_LABS',
  'IMAGING_XRAY',
  'PHYSIOTHERAPY',
  'GENERAL_POST_OP_EVAL',
];

const VALID_VERIFICATION_STATUSES: VerificationStatus[] = [
  'VERIFIED',
  'UNVERIFIED',
  'PENDING_REVIEW',
  'SEEDED_DEMO',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Sanitize & clamp search term (prevent regex injection / DOS)
    const rawSearchTerm = searchParams.get('searchTerm') || searchParams.get('q') || undefined;
    let searchTerm: string | undefined = undefined;
    if (rawSearchTerm) {
      if (rawSearchTerm.length > 150) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Search query exceeds maximum allowed length of 150 characters.',
            },
          },
          { status: 400 }
        );
      }
      searchTerm = rawSearchTerm.trim();
    }

    // 2. City & State validation
    const city = searchParams.get('city')?.trim() || undefined;
    const state = searchParams.get('state')?.trim() || undefined;
    const postalCode = searchParams.get('postalCode')?.trim() || undefined;

    // 3. Coordinate validation
    const latParam = searchParams.get('latitude') || searchParams.get('lat');
    const lngParam = searchParams.get('longitude') || searchParams.get('lng');
    const radiusParam = searchParams.get('radiusKm') || searchParams.get('radius');

    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;
    let radiusKm: number | undefined = undefined;

    if (latParam !== null) {
      latitude = parseFloat(latParam);
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_COORDINATES',
              message: 'Latitude must be a valid number between -90 and 90.',
            },
          },
          { status: 400 }
        );
      }
    }

    if (lngParam !== null) {
      longitude = parseFloat(lngParam);
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_COORDINATES',
              message: 'Longitude must be a valid number between -180 and 180.',
            },
          },
          { status: 400 }
        );
      }
    }

    if (radiusParam !== null) {
      radiusKm = parseFloat(radiusParam);
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
    }

    // 4. Validate & filter ServiceCategory enums
    const servicesParam = searchParams.get('services');
    let services: ServiceCategory[] | undefined = undefined;
    if (servicesParam) {
      const parsed = servicesParam
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is ServiceCategory => VALID_SERVICES.includes(s as ServiceCategory));
      if (parsed.length > 0) services = parsed;
    }

    // 5. Validate FacilityType enums
    const facilityTypeParam = searchParams.get('facilityType');
    let facilityType: FacilityType[] | undefined = undefined;
    if (facilityTypeParam) {
      const parsed = facilityTypeParam
        .split(',')
        .map((f) => f.trim().toUpperCase())
        .filter((f): f is FacilityType => VALID_FACILITY_TYPES.includes(f as FacilityType));
      if (parsed.length > 0) facilityType = parsed;
    }

    // 6. Verification status filter
    const statusParam = searchParams.get('verificationStatus');
    let verificationStatus: VerificationStatus | undefined = undefined;
    if (statusParam) {
      const upper = statusParam.toUpperCase() as VerificationStatus;
      if (VALID_VERIFICATION_STATUSES.includes(upper)) {
        verificationStatus = upper;
      }
    }

    const emergencyOnly = searchParams.get('emergencyOnly') === 'true';

    // 7. Pagination bounds
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10) || 10)) : 10;
    const sortBy = (searchParams.get('sortBy') as 'distance' | 'name' | 'type') || 'distance';

    const result = providerRepository.searchFacilities({
      searchTerm,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      radiusKm,
      services,
      facilityType,
      verificationStatus,
      emergencyOnly,
      page,
      limit,
      sortBy,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DIRECTORY_SEARCH_FAILED',
          message: 'An error occurred while querying the healthcare directory.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Strict Role-Based Authorization
    const roleHeader = request.headers.get('x-user-role');
    const isAuthorized = roleHeader === 'COORDINATOR' || roleHeader === 'ADMIN';

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: Only authorized clinical coordinators and administrators may register new healthcare facilities.',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Mandatory Field Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Facility name must be a valid string of at least 3 characters.',
          },
        },
        { status: 400 }
      );
    }

    if (!body.city || !body.state || !body.postalCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Address components (city, state, postalCode) are mandatory.',
          },
        },
        { status: 400 }
      );
    }

    const created = providerRepository.createFacility({
      name: body.name.trim(),
      facilityType: VALID_FACILITY_TYPES.includes(body.facilityType) ? body.facilityType : 'CLINIC',
      addressLine1: body.addressLine1 || body.address || 'Address unlisted',
      addressLine2: body.addressLine2,
      city: body.city.trim(),
      state: body.state.trim(),
      postalCode: body.postalCode.trim(),
      country: body.country || 'India',
      latitude: body.latitude ? parseFloat(body.latitude) : undefined,
      longitude: body.longitude ? parseFloat(body.longitude) : undefined,
      phone: body.phone,
      email: body.email,
      websiteUrl: body.websiteUrl,
      operatingHours: body.operatingHours,
      emergencyCapable: !!body.emergencyCapable,
      verificationStatus: 'PENDING_REVIEW', // New external submissions always begin as PENDING_REVIEW
      dataSource: 'COMMUNITY_SUBMISSION',
      services: body.services || [],
    });

    return NextResponse.json(
      {
        success: true,
        data: created,
        meta: {
          message: 'Facility successfully registered and queued for clinical verification review.',
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FACILITY_CREATION_FAILED',
          message: 'Failed to create provider record.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
