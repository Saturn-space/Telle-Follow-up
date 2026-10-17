import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { FollowUpService } from '../lib/server/followup-service';
import { store } from '../lib/server/store';
import { POST as webhookRoute } from '../app/api/payments/webhook/route';
import { PATCH as updateNotificationRoute } from '../app/api/notifications/route';
import { GET as getTeleSessionRoute } from '../app/api/teleconsult/sessions/route';

describe('Member 5 — Phase 5 Post-Release Maintenance & Reliability Tests', () => {
  describe('Payment Webhook Processing & Idempotency', () => {
    const webhookSecret = 'test_webhook_secret_key_123';

    beforeEach(() => {
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
      process.env.PAYMENTS_ENABLED = 'true';
    });

    it('rejects webhooks with missing signature header with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'payment.captured' }),
      });

      const res = await webhookRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects webhooks with fraudulent or mismatched HMAC signatures', async () => {
      const bodyStr = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: { entity: { id: 'pay_hack_123', order_id: 'order_test_123' } },
        },
      });

      const req = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
        body: bodyStr,
      });

      const res = await webhookRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_SIGNATURE');
    });

    it('processes legitimate payment.captured webhook idempotently', async () => {
      // 1. Create a payment order in store
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 45000,
      });
      const order = orderRes.order!;
      expect(order.status).toBe('PENDING');

      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wh_legit_456',
              order_id: order.razorpayOrderId,
              amount: 45000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      });

      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookPayload)
        .digest('hex');

      // First webhook delivery
      const req1 = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': validSignature,
        },
        body: webhookPayload,
      });

      const res1 = await webhookRoute(req1);
      const json1 = await res1.json();
      expect(res1.status).toBe(200);
      expect(json1.success).toBe(true);

      const capturedOrder = store.getPaymentOrder(order.id);
      expect(capturedOrder?.status).toBe('CAPTURED');
      expect(capturedOrder?.razorpayPaymentId).toBe('pay_wh_legit_456');

      // Duplicate second webhook delivery (idempotency verification)
      const req2 = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': validSignature,
        },
        body: webhookPayload,
      });

      const res2 = await webhookRoute(req2);
      expect(res2.status).toBe(200);

      // Status should remain CAPTURED without errors or state pollution
      const idempotentOrder = store.getPaymentOrder(order.id);
      expect(idempotentOrder?.status).toBe('CAPTURED');
    });

    it('processes payment.failed webhook and records failure reason', async () => {
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 25000,
      });
      const order = orderRes.order!;

      const webhookPayload = JSON.stringify({
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_789',
              order_id: order.razorpayOrderId,
              error_description: 'Card declined by issuing bank',
            },
          },
        },
      });

      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookPayload)
        .digest('hex');

      const req = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': validSignature,
        },
        body: webhookPayload,
      });

      const res = await webhookRoute(req);
      expect(res.status).toBe(200);

      const failedOrder = store.getPaymentOrder(order.id);
      expect(failedOrder?.status).toBe('FAILED');
      expect(failedOrder?.failureReason).toBe('Card declined by issuing bank');
    });
  });

  describe('Appointment Lifecycle Integrity & Clinical Outcomes', () => {
    it('prohibits direct status update to COMPLETED without clinical outcome record', () => {
      const apptRes = FollowUpService.createAppointment({
        planId: 'plan-101',
        patientId: 'pat-101',
        type: 'LOCAL_CLINIC_VISIT',
        scheduledStartTime: '2026-11-15T09:00:00Z',
        scheduledEndTime: '2026-11-15T09:30:00Z',
        locationOrService: 'Local Health Center',
      });
      const apptId = apptRes.appointment!.id;

      // Attempt to bypass consultation documentation
      const updateRes = FollowUpService.updateAppointmentStatus(apptId, 'COMPLETED');
      expect(updateRes.appointment).toBeUndefined();
      expect(updateRes.error).toContain('cannot be directly marked COMPLETED without a signed clinical consultation');
    });

    it('rejects reschedule when new time slots are identical to current slot', () => {
      const apptRes = FollowUpService.createAppointment({
        planId: 'plan-101',
        patientId: 'pat-101',
        type: 'LOCAL_CLINIC_VISIT',
        scheduledStartTime: '2026-11-16T10:00:00Z',
        scheduledEndTime: '2026-11-16T10:30:00Z',
        locationOrService: 'Local Health Center',
      });
      const apptId = apptRes.appointment!.id;

      const rescheduleRes = FollowUpService.updateAppointmentStatus(apptId, 'RESCHEDULED', {
        newStartTime: '2026-11-16T10:00:00Z',
        newEndTime: '2026-11-16T10:30:00Z',
      });
      expect(rescheduleRes.appointment).toBeUndefined();
      expect(rescheduleRes.error).toContain('Rescheduled times must differ');
    });
  });

  describe('Notification Resilience & Teleconsultation RBAC', () => {
    it('returns 404 when marking a nonexistent notification as read', async () => {
      const req = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'nonexistent-notif-uuid-404' }),
      });

      const res = await updateNotificationRoute(req);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('enforces RBAC on teleconsultation room access between distinct patients', async () => {
      // 1. Create teleconsultation appointment for pat-101
      const apptRes = FollowUpService.createAppointment({
        planId: 'plan-101',
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        scheduledStartTime: '2026-11-18T14:00:00Z',
        scheduledEndTime: '2026-11-18T14:30:00Z',
        locationOrService: 'Virtual Clinic Room',
      });
      const apptId = apptRes.appointment!.id;
      const teleSession = store.getTeleSessionByAppointment(apptId);
      expect(teleSession).toBeDefined();

      // 2. Patient pat-102 attempts to access pat-101 teleconsultation session room
      const unauthorizedReq = new NextRequest(
        `http://localhost:3000/api/teleconsult/sessions?appointmentId=${apptId}`,
        {
          method: 'GET',
          headers: {
            'x-user-role': 'PATIENT',
            'x-user-id': 'pat-102', // Different patient!
          },
        }
      );

      const unauthRes = await getTeleSessionRoute(unauthorizedReq);
      const unauthJson = await unauthRes.json();
      expect(unauthRes.status).toBe(403);
      expect(unauthJson.success).toBe(false);
      expect(unauthJson.error.code).toBe('FORBIDDEN');

      // 3. Authorized patient pat-101 accesses their own session room
      const authorizedReq = new NextRequest(
        `http://localhost:3000/api/teleconsult/sessions?appointmentId=${apptId}`,
        {
          method: 'GET',
          headers: {
            'x-user-role': 'PATIENT',
            'x-user-id': 'pat-101',
          },
        }
      );

      const authRes = await getTeleSessionRoute(authorizedReq);
      const authJson = await authRes.json();
      expect(authRes.status).toBe(200);
      expect(authJson.success).toBe(true);
      expect(authJson.data.appointmentId).toBe(apptId);
    });
  });
});
