import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  try {
    const { providerId } = await params;
    const facility = await prisma.healthcareFacility.findUnique({ where: { id: providerId, isActive: true }, select: { id: true } });
    if (!facility) return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_FOUND', message: 'Facility was not found.' } }, { status: 404 });
    const services = await prisma.facilityService.findMany({ where: { facilityId: providerId }, orderBy: { serviceCategory: 'asc' } });
    return NextResponse.json({ success: true, data: services, meta: { count: services.length } });
  } catch (error) {
    console.error('[providers/:id/services] Lookup failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DIRECTORY_UNAVAILABLE', message: 'Facility services could not be loaded.' } }, { status: 503 });
  }
}
