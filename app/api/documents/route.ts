import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated, requirePatientAccess } from '@/lib/server/db-access';

export async function GET(request: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(request);
    requireAuthenticated(auth);
    const requestedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
    let patientId = requestedPatientId;
    if (auth.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: auth.userId }, select: { id: true } });
      if (!patient) throw new AccessError('Patient profile was not found.', 404);
      if (requestedPatientId && requestedPatientId !== patient.id) throw new AccessError('Patients may access only their own documents.', 403);
      patientId = patient.id;
    }
    if (!patientId) return NextResponse.json({ success: false, error: { code: 'PATIENT_REQUIRED', message: 'Select an authorized patient record.' } }, { status: 400 });
    await requirePatientAccess(auth, patientId);
    const documents = await prisma.medicalDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, originalName: true, mimeType: true, fileSizeBytes: true, documentType: true, ocrText: true, ocrStatus: true, isVerified: true, verifiedBy: true, verifiedAt: true, clinicalNotes: true, createdAt: true },
    });
    await prisma.auditLog.create({ data: { userId: auth.userId, userEmail: auth.email, userRole: auth.role, action: 'VIEW_PATIENT_RECORD', entityType: 'MEDICAL_DOCUMENTS', entityId: patientId } });
    return NextResponse.json({ success: true, data: { documents: documents.map((document) => ({ ...document, downloadUrl: `/api/documents/${document.id}/file` })), patientId } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[documents] Query failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DOCUMENTS_UNAVAILABLE', message: 'Documents could not be loaded.' } }, { status: 503 });
  }
}
