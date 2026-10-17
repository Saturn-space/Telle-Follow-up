import { NextRequest, NextResponse } from 'next/server';
import { SEEDED_PROVIDERS } from '@/lib/travel/data-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = SEEDED_PROVIDERS.find((p) => p.providerId === id);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: `Healthcare provider with ID '${id}' not found.`,
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: provider,
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
          message: error?.message || 'Failed to retrieve provider details.',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
