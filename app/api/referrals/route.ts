import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ReferralStatus, ServiceCategory } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requirePatientAccess, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';

const createSchema = z.object({
  patientId: z.string().min(1).max(128),
  facilityId: z.string().min(1).max(128),
  requestedServices: z.array(z.nativeEnum(ServiceCategory)).min(1).max(20),
  urgencyLevel: z.enum(['ROUTINE', 'PRIORITY', 'URGENT']).default('ROUTINE'),
  clinicalSummary: z.string().trim().min(10).max(4000),
  scheduledDate: z.coerce.date().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    if (!context.isAuthorized) throw new AccessError('A valid session is required.', 401);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25) || 25));
    const patientId = params.get('patientId') || undefined;
    const where: { patientId?: string } = {};
    if (context.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: context.userId }, select: { id: true } });
      if (!patient || (patientId && patientId !== patient.id)) throw new AccessError('Patients may access only their own referrals.', 403);
      where.patientId = patient.id;
    } else if (patientId) {
      await requirePatientAccess(context, patientId);
      where.patientId = patientId;
    } else if (context.role === 'CLINICIAN') {
      return NextResponse.json({ success: false, error: { code: 'PATIENT_FILTER_REQUIRED', message: 'Clinicians must specify an assigned patient.' } }, { status: 400 });
    }

    const [rows, total] = await prisma.$transaction([
      prisma.careReferral.findMany({ where, include: { facility: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.careReferral.count({ where }),
    ]);
    return NextResponse.json({ success: true, data: rows, meta: { total, page, limit } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[referrals] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Referrals could not be loaded.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['CLINICIAN', 'COORDINATOR', 'ADMIN']);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Referral details are invalid.', details: parsed.error.flatten() } }, { status: 400 });
    const input = parsed.data;
    await requirePatientAccess(context, input.patientId);

    const facility = await prisma.healthcareFacility.findUnique({ where: { id: input.facilityId, isActive: true }, select: { id: true, verificationStatus: true } });
    if (!facility) return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_FOUND', message: 'The selected facility is unavailable.' } }, { status: 404 });
    if (facility.verificationStatus !== 'VERIFIED') return NextResponse.json({ success: false, error: { code: 'FACILITY_NOT_VERIFIED', message: 'Referrals can be sent only to facilities with verified credentials.' } }, { status: 409 });

    const referral = await prisma.careReferral.create({
      data: {
        patientId: input.patientId,
        facilityId: input.facilityId,
        requestedServices: input.requestedServices,
        referralStatus: context.role === 'CLINICIAN' ? ReferralStatus.DISPATCHED_TO_LOCAL : ReferralStatus.PENDING_CLINICIAN_APPROVAL,
        urgencyLevel: input.urgencyLevel,
        clinicalSummary: input.clinicalSummary,
        attendingPhysicianId: context.role === 'CLINICIAN' ? context.userId : undefined,
        approvedAt: context.role === 'CLINICIAN' ? new Date() : undefined,
        scheduledDate: input.scheduledDate,
      },
      include: { facility: true },
    });
    return NextResponse.json({ success: true, data: referral }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    console.error('[referrals] Save failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'REFERRAL_SAVE_UNAVAILABLE', message: 'The referral could not be saved.' } }, { status: 503 });
  }
}
