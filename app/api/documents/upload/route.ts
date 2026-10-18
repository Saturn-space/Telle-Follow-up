import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { DocumentType, OcrStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/server/auth-guard';
import { AccessError, requireAuthenticated, requirePatientAccess } from '@/lib/server/db-access';
import { removeEncryptedDocument, writeEncryptedDocument } from '@/lib/server/secure-document-storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function hasValidFileSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

async function extractTextWithConsent(buffer: Buffer, mimeType: string) {
  const serviceUrl = process.env.OCR_SERVICE_URL?.trim();
  const apiKey = process.env.OCR_API_KEY?.trim();
  if (!serviceUrl || !apiKey) throw new Error('External OCR is not configured.');
  const endpoint = new URL(serviceUrl);
  if (endpoint.protocol !== 'https:') throw new Error('OCR_SERVICE_URL must use HTTPS.');
  const form = new URLSearchParams();
  form.set('base64Image', `data:${mimeType};base64,${buffer.toString('base64')}`);
  form.set('apikey', apiKey);
  form.set('language', 'eng');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(), signal: controller.signal });
    if (!response.ok) throw new Error('OCR provider returned an unsuccessful response.');
    const result = await response.json() as { IsErroredOnProcessing?: boolean; ParsedResults?: Array<{ ParsedText?: string }> };
    if (result.IsErroredOnProcessing) throw new Error('OCR provider could not process the document.');
    return (result.ParsedResults || []).map((item) => item.ParsedText || '').join('\n').slice(0, 100_000);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  let storagePath: string | undefined;
  try {
    const auth = await getVerifiedAuthContext(request);
    requireAuthenticated(auth);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'Choose a PDF, PNG, or JPEG document.' } }, { status: 400 });
    if (file.size < 1 || file.size > MAX_FILE_BYTES) return NextResponse.json({ success: false, error: { code: 'FILE_SIZE_INVALID', message: 'Documents must be no larger than 10 MB.' } }, { status: 413 });
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return NextResponse.json({ success: false, error: { code: 'FILE_TYPE_INVALID', message: 'Only PDF, PNG, and JPEG documents are supported.' } }, { status: 415 });

    let patientId = typeof form.get('patientId') === 'string' ? String(form.get('patientId')).trim() : '';
    if (auth.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: auth.userId }, select: { id: true } });
      if (!patient) throw new AccessError('Patient profile was not found.', 404);
      patientId = patient.id;
    }
    if (!patientId) return NextResponse.json({ success: false, error: { code: 'PATIENT_REQUIRED', message: 'Select an authorized patient record.' } }, { status: 400 });
    await requirePatientAccess(auth, patientId);

    const rawType = String(form.get('documentType') || 'DISCHARGE_SUMMARY');
    if (!Object.values(DocumentType).includes(rawType as DocumentType)) return NextResponse.json({ success: false, error: { code: 'DOCUMENT_TYPE_INVALID', message: 'Choose a supported document type.' } }, { status: 400 });
    const externalOcrConsent = form.get('externalOcrConsent') === 'true';
    if (externalOcrConsent && (!process.env.OCR_SERVICE_URL || !process.env.OCR_API_KEY)) {
      return NextResponse.json({ success: false, error: { code: 'OCR_NOT_CONFIGURED', message: 'External OCR is unavailable. Upload the document without external OCR or contact the system administrator.' } }, { status: 409 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasValidFileSignature(bytes, file.type)) return NextResponse.json({ success: false, error: { code: 'FILE_SIGNATURE_INVALID', message: 'The selected file contents do not match its declared document type.' } }, { status: 415 });
    const id = randomUUID();
    storagePath = `${id}.enc`;
    await writeEncryptedDocument(storagePath, bytes);

    let ocrText: string | undefined;
    let ocrStatus: OcrStatus = OcrStatus.NOT_REQUIRED;
    if (externalOcrConsent) {
      try {
        ocrText = await extractTextWithConsent(bytes, file.type) || undefined;
        ocrStatus = ocrText ? OcrStatus.PROCESSED : OcrStatus.FAILED;
      } catch {
        ocrStatus = OcrStatus.FAILED;
      }
    }
    const originalName = file.name.replace(/[\u0000-\u001f\u007f]/g, '').split(/[\\/]/).pop()?.slice(0, 255) || 'medical-document';
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.medicalDocument.create({
        data: {
          id,
          patientId,
          fileName: storagePath!,
          originalName,
          mimeType: file.type,
          fileSizeBytes: file.size,
          storagePath: storagePath!,
          documentType: rawType as DocumentType,
          ocrText,
          ocrStatus,
          isVerified: false,
        },
        select: { id: true, originalName: true, documentType: true, ocrStatus: true, isVerified: true, createdAt: true },
      });
      await tx.auditLog.create({ data: { userId: auth.userId, userEmail: auth.email, userRole: auth.role, action: 'DOCUMENT_UPLOAD', entityType: 'MEDICAL_DOCUMENT', entityId: created.id, details: `Document stored; OCR status ${ocrStatus}.` } });
      return created;
    });
    return NextResponse.json({ success: true, data: { document, downloadUrl: `/api/documents/${document.id}/file` }, message: `Document stored securely. OCR status: ${ocrStatus}.` }, { status: 201 });
  } catch (error) {
    if (storagePath) await removeEncryptedDocument(storagePath);
    if (error instanceof AccessError) return NextResponse.json({ success: false, error: { code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message } }, { status: error.status });
    console.error('[documents/upload] Save failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: { code: 'DOCUMENT_UPLOAD_UNAVAILABLE', message: 'The document could not be saved. Check storage and encryption configuration.' } }, { status: 503 });
  }
}
