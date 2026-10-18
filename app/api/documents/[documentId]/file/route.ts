import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated, requirePatientAccess } from '@/lib/server/db-access';
import { readEncryptedDocument } from '@/lib/server/secure-document-storage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const auth = await getVerifiedAuthContext(request);
    requireAuthenticated(auth);
    const { documentId } = await params;
    const document = await prisma.medicalDocument.findUnique({ where: { id: documentId }, select: { id: true, patientId: true, originalName: true, mimeType: true, storagePath: true } });
    if (!document) throw new AccessError('Document was not found.', 404);
    await requirePatientAccess(auth, document.patientId);
    const bytes = await readEncryptedDocument(document.storagePath);
    await prisma.auditLog.create({ data: { userId: auth.userId, userEmail: auth.email, userRole: auth.role, action: 'DOCUMENT_VIEW', entityType: 'MEDICAL_DOCUMENT', entityId: document.id } });
    const safeName = encodeURIComponent(document.originalName).replace(/['()]/g, escape);
    return new NextResponse(new Uint8Array(bytes), { headers: {
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${safeName}`,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[documents/file] Read failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DOCUMENT_FILE_UNAVAILABLE', message: 'The encrypted document could not be opened.' } }, { status: 503 });
  }
}
