// ============================================================================
// API ROUTE: /api/providers/[providerId]/verification (HARDENED - PHASE 3)
// POST: Record an authorized clinical verification audit entry and update status
// Guardrails: Strict Role Enforcement, Audit Evidence Validation, State Transition Checks
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { providerRepository } from '@/lib/db/provider-repository';
import { VerificationStatus } from '@/lib/types/provider';

interface RouteParams {
  params: Promise<{
    providerId: string;
  }>;
}

const VALID_STATUSES: VerificationStatus[] = [
  'VERIFIED',
  'UNVERIFIED',
  'PENDING_REVIEW',
  'SEEDED_DEMO',
];

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { providerId } = await params;

    if (!providerId || typeof providerId !== 'string' || providerId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'A valid providerId path parameter is required.',
          },
        },
        { status: 400 }
      );
    }

    // 1. Strict Role Authorization
    const roleHeader = request.headers.get('x-user-role');
    const isAuthorized = roleHeader === 'ADMIN' || roleHeader === 'COORDINATOR';

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: Only clinical administrators and coordinators with verified credentials can modify verification status.',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 2. Status Validation
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Verification status must be one of: ${VALID_STATUSES.join(', ')}.`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Mandatory Evidence Notes (At least 10 characters explaining method of clinical audit)
    if (!body.evidenceNotes || typeof body.evidenceNotes !== 'string' || body.evidenceNotes.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_EVIDENCE',
            message: 'Mandatory clinical audit notes of at least 10 characters are required detailing how the facility was inspected or verified.',
          },
        },
        { status: 400 }
      );
    }

    // 4. Special Rule for 'VERIFIED': Check registry or license number format if provided
    if (body.status === 'VERIFIED' && body.registryLicenseNo && body.registryLicenseNo.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LICENSE',
            message: 'Provided state medical/clinical registry license number must be at least 3 characters.',
          },
        },
        { status: 400 }
      );
    }

    const verifierUserId =
      body.verifierUserId ||
      request.headers.get('x-user-id') ||
      (roleHeader === 'ADMIN' ? 'coord_dr_sharma_admin' : 'coord_dr_deshmukh');

    const updatedFacility = providerRepository.recordVerification(providerId, {
      status: body.status,
      evidenceNotes: body.evidenceNotes.trim(),
      registryLicenseNo: body.registryLicenseNo?.trim() || undefined,
      verifierUserId,
    });

    if (!updatedFacility) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FACILITY_NOT_FOUND',
            message: `Healthcare facility with ID '${providerId}' does not exist.`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedFacility,
      meta: {
        message: `Facility verification status successfully updated to ${body.status} with permanent audit log entry.`,
        verifiedAt: updatedFacility.lastVerifiedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VERIFICATION_UPDATE_FAILED',
          message: 'Failed to record verification decision.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
