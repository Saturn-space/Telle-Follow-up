import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/lib/server/followup-service';
import { store } from '@/lib/server/store';
import { ApiResponse } from '@/lib/types/followup';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to view payment records.',
          },
        },
        { status: 401 }
      );
    }

    // Clinicians and Coordinators can view all payments, Patients can ONLY view their own
    let payments;
    if (userRole === 'CLINICIAN' || userRole === 'COORDINATOR' || userRole === 'ADMIN') {
      payments = store.getAllPaymentOrders();
    } else {
      payments = FollowUpService.getUserPayments(userId);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        payments,
        currency: 'INR',
        count: payments.length,
      },
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
