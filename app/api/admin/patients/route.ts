import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireRoles } from '@/lib/server/db-access';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await getVerifiedAuthContext(request);
    requireRoles(context, ['ADMIN']);

    const patients = await prisma.patient.findMany({
      include: {
        user: { select: { id: true, email: true, role: true, createdAt: true, paymentOrders: { orderBy: { createdAt: 'desc' } } } },
        surgeries: { orderBy: { surgeryDate: 'desc' } },
        recoveryLogs: { orderBy: { logTimestamp: 'desc' } },
        riskAssessments: {
          orderBy: { createdAt: 'desc' },
          include: { reviews: { orderBy: { reviewedAt: 'desc' } }, contributingFactors: true, clinicalAlerts: true },
        },
        travelComparisons: { orderBy: { createdAt: 'desc' } },
        followUpPlans: {
          orderBy: { createdAt: 'desc' },
          include: {
            appointments: {
              orderBy: { scheduledStartTime: 'desc' },
              include: {
                facility: true,
                teleSession: { select: { id: true, status: true, startedAt: true, endedAt: true, createdAt: true } },
                outcomeRecord: true,
                paymentOrders: true,
              },
            },
          },
        },
        careReferrals: { orderBy: { createdAt: 'desc' } },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, fileName: true, originalName: true, mimeType: true, fileSizeBytes: true,
            documentType: true, ocrText: true, ocrStatus: true, isVerified: true, verifiedBy: true,
            verifiedAt: true, clinicalNotes: true, createdAt: true, updatedAt: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        userEmail: context.email,
        userRole: context.role,
        action: 'VIEW_PATIENT_RECORD',
        entityType: 'ADMIN_PATIENT_DIRECTORY',
        details: `Administrator viewed ${patients.length} patient records.`,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({ success: true, data: { patients, total: patients.length } });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: error.message } }, { status: error.status });
    }
    console.error('[admin/patients] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'ADMIN_PATIENTS_UNAVAILABLE', message: 'Patient records could not be loaded.' } }, { status: 503 });
  }
}
