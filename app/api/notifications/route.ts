import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/server/store';
import { ApiResponse } from '@/lib/types/followup';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientUserId = searchParams.get('recipientUserId') || undefined;

    const notifs = store.getNotifications(recipientUserId);

    const response: ApiResponse = {
      success: true,
      data: notifs,
      meta: { timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Notification ID required' } },
        { status: 400 }
      );
    }

    const updated = store.markNotificationRead(id);

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Notification with ID '${id}' not found.` },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: { id, read: true },
      meta: { timestamp: new Date().toISOString() },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
