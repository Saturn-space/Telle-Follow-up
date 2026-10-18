import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FacilityType, ProviderDataSource, ServiceCategory, VerificationStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { calculateHaversineDistanceKm } from '@/lib/travel/routing-adapter';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';

const facilityInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  facilityType: z.nativeEnum(FacilityType).default(FacilityType.CLINIC),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(3).max(20),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().optional(),
  websiteUrl: z.string().trim().url().optional(),
  services: z.array(z.object({
    serviceCategory: z.nativeEnum(ServiceCategory),
    specialtyName: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000).optional(),
    estimatedCostINR: z.number().nonnegative().max(10_000_000).optional(),
  })).max(30).default([]),
});

function errorResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const query = (params.get('searchTerm') || params.get('q') || '').trim();
    if (query.length > 150) return NextResponse.json({ success: false, error: { code: 'INVALID_PARAMETER', message: 'Search text must be 150 characters or fewer.' } }, { status: 400 });

    const page = Math.max(1, Number(params.get('page') || 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.get('limit') || 10) || 10));
    const lat = params.has('latitude') ? Number(params.get('latitude')) : params.has('lat') ? Number(params.get('lat')) : undefined;
    const lng = params.has('longitude') ? Number(params.get('longitude')) : params.has('lng') ? Number(params.get('lng')) : undefined;
    const radius = Number(params.get('radiusKm') || params.get('radius') || 500);
    if ((lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) || (lng !== undefined && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_COORDINATES', message: 'Latitude or longitude is outside its valid range.' } }, { status: 400 });
    }
    if (!Number.isFinite(radius) || radius <= 0 || radius > 500) return NextResponse.json({ success: false, error: { code: 'INVALID_RADIUS', message: 'Radius must be between 1 and 500 km.' } }, { status: 400 });

    const serviceValues = (params.get('services') || '').split(',').filter(Boolean).map((v) => v.toUpperCase());
    const facilityValues = (params.get('facilityType') || '').split(',').filter(Boolean).map((v) => v.toUpperCase());
    const services = serviceValues.filter((v): v is ServiceCategory => Object.values(ServiceCategory).includes(v as ServiceCategory));
    const facilityTypes = facilityValues.filter((v): v is FacilityType => Object.values(FacilityType).includes(v as FacilityType));
    const statusParam = params.get('verificationStatus');
    const verificationStatus = statusParam && Object.values(VerificationStatus).includes(statusParam.toUpperCase() as VerificationStatus)
      ? statusParam.toUpperCase() as VerificationStatus
      : VerificationStatus.VERIFIED;

    const where = {
      isActive: true,
      verificationStatus,
      emergencyCapable: params.get('emergencyOnly') === 'true' ? true : undefined,
      city: params.get('city')?.trim() ? { contains: params.get('city')!.trim(), mode: 'insensitive' as const } : undefined,
      state: params.get('state')?.trim() ? { contains: params.get('state')!.trim(), mode: 'insensitive' as const } : undefined,
      postalCode: params.get('postalCode')?.trim() ? { contains: params.get('postalCode')!.trim() } : undefined,
      facilityType: facilityTypes.length ? { in: facilityTypes } : undefined,
      services: services.length ? { some: { serviceCategory: { in: services } } } : undefined,
      OR: query ? [
        { name: { contains: query, mode: 'insensitive' as const } },
        { city: { contains: query, mode: 'insensitive' as const } },
        { state: { contains: query, mode: 'insensitive' as const } },
        { addressLine1: { contains: query, mode: 'insensitive' as const } },
      ] : undefined,
    };

    const [rows, total] = await prisma.$transaction([
      prisma.healthcareFacility.findMany({
        where,
        include: { services: true, verifications: { orderBy: { verifiedAt: 'desc' }, take: 1 } },
        orderBy: params.get('sortBy') === 'name' ? { name: 'asc' } : { updatedAt: 'desc' },
        take: 1000,
      }),
      prisma.healthcareFacility.count({ where }),
    ]);

    let results = rows.map((facility) => ({
      ...facility,
      distanceKm: lat !== undefined && lng !== undefined && facility.latitude !== null && facility.longitude !== null
        ? calculateHaversineDistanceKm(lat, lng, facility.latitude, facility.longitude)
        : undefined,
    }));
    if (lat !== undefined && lng !== undefined) results = results.filter((facility) => facility.distanceKm !== undefined && facility.distanceKm <= radius);
    if (params.get('sortBy') === 'distance' && lat !== undefined && lng !== undefined) results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    const count = results.length;
    const data = results.slice((page - 1) * limit, page * limit);
    return NextResponse.json({
      success: true,
      data,
      meta: { total: lat !== undefined && lng !== undefined ? count : total, page, limit, totalPages: Math.ceil((lat !== undefined && lng !== undefined ? count : total) / limit), source: 'POSTGRESQL', emptyReason: count === 0 ? 'No verified provider records match this search.' : undefined },
    });
  } catch (error) {
    console.error('[providers] Search failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DIRECTORY_UNAVAILABLE', message: 'Provider search is unavailable because the directory could not be loaded.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['COORDINATOR', 'ADMIN']);
    const parsed = facilityInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Facility details are invalid.', details: parsed.error.flatten() } }, { status: 400 });

    const input = parsed.data;
    const facility = await prisma.healthcareFacility.create({
      data: {
        name: input.name,
        facilityType: input.facilityType,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone,
        email: input.email,
        websiteUrl: input.websiteUrl,
        verificationStatus: VerificationStatus.PENDING_REVIEW,
        dataSource: ProviderDataSource.COMMUNITY_SUBMISSION,
        services: { create: input.services },
      },
      include: { services: true },
    });
    return NextResponse.json({ success: true, data: facility }, { status: 201 });
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    console.error('[providers] Facility submission failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'FACILITY_SAVE_UNAVAILABLE', message: 'The facility submission could not be saved.' } }, { status: 503 });
  }
}
