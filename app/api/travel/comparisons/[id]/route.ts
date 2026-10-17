import { NextRequest, NextResponse } from 'next/server';
import { SAVED_COMPARISONS } from '@/lib/travel/data-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comparison = SAVED_COMPARISONS.get(id);

    if (!comparison) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: `Travel comparison with ID '${id}' not found.`,
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: comparison,
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
          code: 'SERVER_ERROR',
          message: error?.message || 'Failed to retrieve travel comparison.',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
