// ============================================================================
// API ROUTE: /api/referrals
// GET: List care coordination referrals
// POST: Dispatch a new post-op referral to a local healthcare facility
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { providerRepository } from '@/lib/db/provider-repository';
import { ServiceCategory } from '@/lib/types/provider';

export async function GET() {
  try {
    const referrals = providerRepository.listReferrals();
    return NextResponse.json({
      success: true,
      data: referrals,
      meta: {
        totalCount: referrals.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFERRALS_FETCH_FAILED',
          message: 'Failed to retrieve referral records.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.patientId || !body.facilityId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both patientId and facilityId are required to initiate a care referral.',
          },
        },
        { status: 400 }
      );
    }

    if (!body.requestedServices || !Array.isArray(body.requestedServices) || body.requestedServices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one requested service category must be specified.',
          },
        },
        { status: 400 }
      );
    }

    const createdReferral = providerRepository.createReferral({
      patientId: body.patientId,
      facilityId: body.facilityId,
      requestedServices: body.requestedServices as ServiceCategory[],
      urgencyLevel: body.urgencyLevel || 'ROUTINE',
      clinicalSummary: body.clinicalSummary || 'Post-surgical follow-up care request.',
      attendingPhysicianId: body.attendingPhysicianId || 'dr_surgical_lead',
      scheduledDate: body.scheduledDate,
    });

    if (!createdReferral) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FACILITY_NOT_FOUND',
            message: `Target facility ${body.facilityId} does not exist.`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: createdReferral,
        meta: {
          message: 'Care coordination referral successfully created and dispatched.',
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFERRAL_CREATION_FAILED',
          message: 'Failed to create care referral record.',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
