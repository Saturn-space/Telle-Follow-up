import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProviderDataSource, VerificationStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireRoles } from '@/lib/server/db-access';

const verificationSchema = z.object({
  status: z.enum(['VERIFIED', 'UNVERIFIED']),
  evidenceNotes: z.string().trim().min(20).max(4000),
  registryLicenseNo: z.string().trim().min(3).max(120).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['ADMIN']);
    const { providerId } = await params;
    const parsed = verificationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Verification evidence is incomplete.', details: parsed.error.flatten() } }, { status: 400 });
    if (parsed.data.status === 'VERIFIED' && !parsed.data.registryLicenseNo) {
      return NextResponse.json({ success: false, error: { code: 'LICENSE_REQUIRED', message: 'A registry license number is required before recording a verified status.' } }, { status: 400 });
    }

    const existingFacility = await prisma.healthcareFacility.findUnique({ where: { id: providerId }, select: { dataSource: true } });
    if (!existingFacility) return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_FOUND', message: 'Facility was not found.' } }, { status: 404 });
    if (parsed.data.status === 'VERIFIED' && existingFacility.dataSource === ProviderDataSource.SYNTHETIC_SEED) {
      return NextResponse.json({ success: false, error: { code: 'SYNTHETIC_DEMO_CANNOT_BE_VERIFIED', message: 'Synthetic demo listings cannot be marked as verified providers.' } }, { status: 409 });
    }

    const facility = await prisma.$transaction(async (tx) => {
      await tx.providerVerificationRecord.create({
        data: {
          facilityId: providerId,
          status: parsed.data.status as VerificationStatus,
          verifierUserId: context.userId,
          evidenceNotes: parsed.data.evidenceNotes,
          registryLicenseNo: parsed.data.registryLicenseNo,
        },
      });
      const updated = await tx.healthcareFacility.update({
        where: { id: providerId },
        data: {
          verificationStatus: parsed.data.status as VerificationStatus,
          lastVerifiedAt: parsed.data.status === 'VERIFIED' ? new Date() : null,
          dataSource: parsed.data.status === 'VERIFIED' ? 'OFFICIAL_REGISTRY' : undefined,
        },
        include: { services: true, verifications: { orderBy: { verifiedAt: 'desc' }, take: 1 } },
      });
      await tx.auditLog.create({
        data: {
          userId: context.userId,
          userEmail: context.email,
          userRole: context.role,
          action: 'PROVIDER_VERIFICATION',
          entityType: 'HEALTHCARE_FACILITY',
          entityId: providerId,
          details: `Facility status recorded as ${parsed.data.status}.`,
        },
      });
      return updated;
    });
    return NextResponse.json({ success: true, data: facility });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'P2025') return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_FOUND', message: 'Facility was not found.' } }, { status: 404 });
    console.error('[providers/:id/verification] Verification update failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'VERIFICATION_UNAVAILABLE', message: 'The verification record could not be saved.' } }, { status: 503 });
  }
}
