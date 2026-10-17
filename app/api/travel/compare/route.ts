import { NextRequest, NextResponse } from 'next/server';
import { TravelComparisonRequestSchema } from '@/lib/travel/types';
import { executeTravelComparison } from '@/lib/travel/comparison-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate request payload using Zod schema
    const parseResult = TravelComparisonRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid travel comparison request parameters.',
            details: parseResult.error.format(),
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // 2. Execute safety-first comparison workflow
    const result = await executeTravelComparison(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'PROCESSING_ERROR',
          message: error?.message || 'An unexpected error occurred during travel comparison.',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
