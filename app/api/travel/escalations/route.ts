import { NextRequest, NextResponse } from 'next/server';
import { EscalationEventRequestSchema } from '@/lib/travel/types';
import { SAVED_ESCALATIONS, SEEDED_PROVIDERS } from '@/lib/travel/data-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = EscalationEventRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid escalation request payload.',
            details: parseResult.error.format(),
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    const { comparisonId, patientId, reason, urgencyLevel, redFlags } = parseResult.data;
    const eventId = `esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Identify closest 24/7 emergency trauma center
    const emergencyFacility = SEEDED_PROVIDERS.find(
      (p) => p.supportedServices.includes('EMERGENCY_SURGICAL_CARE')
    ) ?? SEEDED_PROVIDERS[0];

    const escalationEvent = {
      eventId,
      comparisonId,
      patientId,
      triggeredAt: new Date().toISOString(),
      reason,
      urgencyLevel,
      redFlags,
      recommendedAction:
        'Immediate in-person emergency surgical triage required. Do not wait for routine clinic hours or remote consultation.',
      nearestEmergencyFacility: {
        name: emergencyFacility.name,
        distanceKm: 8.4,
        phone: emergencyFacility.contactPhone,
      },
    };

    SAVED_ESCALATIONS.set(eventId, escalationEvent);

    return NextResponse.json(
      {
        success: true,
        data: escalationEvent,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'SERVER_ERROR',
          message: error?.message || 'Failed to process escalation event.',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
