import { NextRequest, NextResponse } from 'next/server';
import { ServiceCategory } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { calculateHaversineDistanceKm } from '@/lib/travel/routing-adapter';

export async function GET(request: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(request);
    if (!auth.isAuthorized) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: auth.error || 'A valid session is required.' } }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const lat = Number(params.get('lat') || params.get('latitude'));
    const lng = Number(params.get('lng') || params.get('longitude'));
    const radius = Number(params.get('radiusKm') || params.get('radius') || 25);
    const limit = Math.min(50, Math.max(1, Number(params.get('limit') || 10)));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_COORDINATES', message: 'Valid latitude and longitude are required.' } }, { status: 400 });
    }
    if (!Number.isFinite(radius) || radius <= 0 || radius > 500) return NextResponse.json({ success: false, error: { code: 'INVALID_RADIUS', message: 'Radius must be between 1 and 500 km.' } }, { status: 400 });
    const rawServices = (params.get('services') || '').split(',').filter(Boolean).map((value) => value.trim().toUpperCase());
    const services = rawServices.filter((value): value is ServiceCategory => Object.values(ServiceCategory).includes(value as ServiceCategory));
    if (rawServices.length && services.length !== rawServices.length) return NextResponse.json({ success: false, error: { code: 'INVALID_SERVICE', message: 'One or more requested service categories are invalid.' } }, { status: 400 });
    const facilities = await prisma.healthcareFacility.findMany({
      where: { isActive: true, verificationStatus: 'VERIFIED', latitude: { not: null }, longitude: { not: null }, services: services.length ? { some: { serviceCategory: { in: services } } } : undefined },
      include: { services: true, verifications: { orderBy: { verifiedAt: 'desc' }, take: 1 } },
      take: 300,
    });
    const data = facilities.map((facility) => ({ ...facility, distanceKm: calculateHaversineDistanceKm(lat, lng, facility.latitude!, facility.longitude!) }))
      .filter((facility) => facility.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
    return NextResponse.json({ success: true, data, meta: { count: data.length, center: { latitude: lat, longitude: lng }, radiusKm: radius } });
  } catch (error) {
    console.error('[providers/nearby] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'NEARBY_SEARCH_UNAVAILABLE', message: 'Nearby verified facilities could not be loaded.' } }, { status: 503 });
  }
}
