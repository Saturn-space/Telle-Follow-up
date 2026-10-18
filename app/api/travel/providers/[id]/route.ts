import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated } from '@/lib/server/db-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuthenticated(await getVerifiedAuthContext(request));
    const { id } = await params;
    const facility = await prisma.healthcareFacility.findFirst({ where: { id, isActive: true, verificationStatus: 'VERIFIED' }, include: { services: true, verifications: { orderBy: { verifiedAt: 'desc' }, take: 1 } } });
    if (!facility) throw new AccessError('Verified provider was not found.', 404);
    return NextResponse.json({ success: true, data: facility, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[travel/provider] Read failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Provider information could not be loaded.' } }, { status: 503 });
  }
}
