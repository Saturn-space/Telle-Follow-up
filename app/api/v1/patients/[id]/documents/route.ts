import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { OcrService } from '@/lib/services/ocr-service';
import { DocumentCategory } from '@/lib/types/patient';
import { AuthGuard } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = AuthGuard.getAuthContext(req);
    if (!AuthGuard.canAccessPatient(auth, id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You are not authorized to view documents for this patient.',
          },
        },
        { status: 403 }
      );
    }
    const patient = db.getPatientById(id);

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Patient with ID '${id}' was not found.`,
          },
        },
        { status: 404 }
      );
    }

    const documents = db.getDocumentsByPatientId(id);

    return NextResponse.json({
      success: true,
      data: {
        patientId: id,
        total: documents.length,
        documents,
      },
      message: 'Medical documents retrieved successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error retrieving documents',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = AuthGuard.getAuthContext(req);
    if (!AuthGuard.canAccessPatient(auth, id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You cannot upload documents for another patient.',
          },
        },
        { status: 403 }
      );
    }

    const patient = db.getPatientById(id);

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Patient with ID '${id}' was not found.`,
          },
        },
        { status: 404 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let originalName = 'document.pdf';
    let mimeType = 'application/pdf';
    let category: DocumentCategory = 'DISCHARGE_SUMMARY';
    let fileBuffer: Buffer | string = '';
    let fileSize = 0;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const catParam = formData.get('category') as string | null;

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No file was provided in the multipart upload.',
            },
          },
          { status: 400 }
        );
      }

      originalName = file.name;
      mimeType = file.type || 'application/octet-stream';
      fileSize = file.size;
      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);

      if (catParam) {
        category = catParam as DocumentCategory;
      }
    } else {
      // JSON upload with Base64 payload or simulated clinical upload
      const body = await req.json();
      originalName = body.originalName || 'discharge_summary.pdf';
      mimeType = body.mimeType || 'application/pdf';
      category = (body.category as DocumentCategory) || 'DISCHARGE_SUMMARY';
      fileSize = body.fileSize || 1024 * 150;
      fileBuffer = body.base64Content || '';
    }

    // Size limit check (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Uploaded file exceeds maximum permitted size of 10MB (${(fileSize / 1024 / 1024).toFixed(2)} MB).`,
          },
        },
        { status: 413 }
      );
    }

    // MIME Whitelist validation
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `Unsupported file MIME type '${mimeType}'. Supported types are PDF, JPEG, PNG, and WEBP.`,
          },
        },
        { status: 415 }
      );
    }

    // Magic bytes / content-based header verification (anti-spoofing)
    if (Buffer.isBuffer(fileBuffer) && fileBuffer.length >= 4) {
      const header4Hex = fileBuffer.subarray(0, 4).toString('hex').toLowerCase();
      const header4Ascii = fileBuffer.subarray(0, 4).toString('ascii');

      if (mimeType.toLowerCase() === 'application/pdf' && !header4Ascii.startsWith('%PDF')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONTENT_MIME_MISMATCH',
              message: 'File content does not match declared PDF format. Signature header rejected.',
            },
          },
          { status: 415 }
        );
      }

      if (mimeType.toLowerCase() === 'image/png' && header4Hex !== '89504e47') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONTENT_MIME_MISMATCH',
              message: 'File content does not match declared PNG format.',
            },
          },
          { status: 415 }
        );
      }

      if (mimeType.toLowerCase() === 'image/jpeg' && !header4Hex.startsWith('ffd8ff')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONTENT_MIME_MISMATCH',
              message: 'File content does not match declared JPEG format.',
            },
          },
          { status: 415 }
        );
      }
    }

    // Strict path traversal defense: strip any directory separators or parent references
    const cleanFileName = originalName
      .replace(/[\/\\]/g, '')
      .replace(/\.\./g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const safeHash = Math.random().toString(36).substring(2, 10);
    const sanitizedExt = cleanFileName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'dat';
    const safeStoragePath = `/uploads/documents/${id}/${Date.now()}_${safeHash}.${sanitizedExt}`;

    // Execute OCR extraction pipeline
    const ocrResult = await OcrService.processDocument(originalName, mimeType, fileBuffer);

    // Persist document record and initial OCR extraction
    const document = db.createDocument(
      {
        patientId: id,
        category,
        originalName: originalName.replace(/[^a-zA-Z0-9._-]/g, '_'),
        mimeType,
        fileSize,
        filePath: safeStoragePath,
      },
      {
        status: ocrResult.status,
        rawExtractedText: ocrResult.rawExtractedText,
        extractedMetadata: ocrResult.extractedMetadata,
        isVerified: false, // Must be verified by human reviewer
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: document,
        message: 'Document uploaded and processed through OCR extraction. Awaiting clinical verification.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Error uploading document',
        },
      },
      { status: 500 }
    );
  }
}
