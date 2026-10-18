import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ providerId: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  addressLine1: z.string().trim().min(3).max(200).optional(),
  addressLine2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().min(1).max(100).optional(),
  postalCode: z.string().trim().min(3).max(20).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  websiteUrl: z.string().trim().url().nullable().optional(),
  emergencyCapable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { providerId } = await params;
    const facility = await prisma.healthcareFacility.findUnique({
      where: { id: providerId, isActive: true },
      include: { services: true, verifications: { orderBy: { verifiedAt: 'desc' } } },
    });
    if (!facility) return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_FOUND', message: 'Facility was not found.' } }, { status: 404 });
    return NextResponse.json({ success: true, data: facility });
  } catch (error) {
    console.error('[providers/:id] Lookup failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DIRECTORY_UNAVAILABLE', message: 'Facility details could not be loaded.' } }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['COORDINATOR', 'ADMIN']);
    const { providerId } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide valid facility fields to update.', details: parsed.success ? undefined : parsed.error.flatten() } }, { status: 400 });
    }
    const facility = await prisma.healthcareFacility.update({
      where: { id: providerId },
      data: parsed.data,
      include: { services: true, verifications: { orderBy: { verifiedAt: 'desc' }, take: 1 } },
    });
    return NextResponse.json({ success: true, data: facility });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'P2025') return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_FOUND', message: 'Facility was not found.' } }, { status: 404 });
    console.error('[providers/:id] Update failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'FACILITY_UPDATE_UNAVAILABLE', message: 'Facility changes could not be saved.' } }, { status: 503 });
  }
}
