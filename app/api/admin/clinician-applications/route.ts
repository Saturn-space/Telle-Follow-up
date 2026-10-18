import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireRoles } from '@/lib/server/db-access';

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['ADMIN']);
    const applications = await prisma.clinicianRegistrationApplication.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        medicalLicenseNumber: true,
        specialty: true,
        institution: true,
        phone: true,
        city: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ success: true, data: { applications } });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    }
    console.error('[admin/clinician-applications] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Clinician applications could not be loaded.' } }, { status: 503 });
  }
}
