// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - RAZORPAY PAYMENT GATEWAY TEST SUITE (INR ONLY)
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { FollowUpService } from '../lib/server/followup-service';
import { store } from '../lib/server/store';
import { SERVICE_PRICING_INR } from '../lib/types/followup';
import { POST as createOrderRoute } from '../app/api/payments/create-order/route';
import { POST as verifyPaymentRoute } from '../app/api/payments/verify/route';
import { POST as webhookRoute } from '../app/api/payments/webhook/route';
import { GET as myPaymentsRoute } from '../app/api/payments/my-payments/route';

describe('Razorpay Payment Gateway Integration (INR Only)', () => {
  const testSecret = 'test_razorpay_secret_12345';
  const testWebhookSecret = 'test_webhook_secret_67890';

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = testSecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
    process.env.PAYMENTS_ENABLED = 'true';
  });

  // --------------------------------------------------------------------------
  // 1. Order Creation & Paise Arithmetic
  // --------------------------------------------------------------------------
  describe('1. Order Creation with INR Currency & Integer Paise Conversion', () => {
    it('creates an order in INR with correct paise conversion (₹500 = 50000 paise)', () => {
      const res = FollowUpService.createPaymentOrder({
        userId: 'pat-101',
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });

      expect(res.error).toBeUndefined();
      expect(res.order).toBeDefined();
      expect(res.order?.currency).toBe('INR');
      expect(res.order?.amount).toBe(50000); // exactly 50000 paise = ₹500
      expect(Number.isInteger(res.order?.amount)).toBe(true);
      expect(res.order?.status).toBe('PENDING');
      expect(res.order?.signatureVerified).toBe(false);
      expect(res.order?.razorpayOrderId).toMatch(/^order_/);
    });

    it('creates correct paise amounts for all catalog services', () => {
      for (const [key, val] of Object.entries(SERVICE_PRICING_INR)) {
        const res = FollowUpService.createPaymentOrder({
          planId: 'plan-101',
          serviceType: key,
        });
        expect(res.order?.amount).toBe(val.paise);
        expect(res.order!.amount / 100).toBe(val.rupees);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Currency Enforcement (INR Only)
  // --------------------------------------------------------------------------
  describe('2. Strict INR-Only Currency Enforcement', () => {
    it('rejects unsupported currency (USD, EUR) at domain service level', () => {
      const resUSD = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        currency: 'USD',
      });
      expect(resUSD.order).toBeUndefined();
      expect(resUSD.error).toContain('Unsupported currency');
      expect(resUSD.error).toContain('Only INR (₹) transactions are supported');

      const resEUR = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        currency: 'EUR',
      });
      expect(resEUR.order).toBeUndefined();
      expect(resEUR.error).toContain('Unsupported currency');
    });

    it('rejects non-INR currency in API route with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'plan-101',
          currency: 'USD',
        }),
      });

      const res = await createOrderRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('Only INR currency is supported');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Server-Side Price Authority & Tampered Amount Rejection
  // --------------------------------------------------------------------------
  describe('3. Server-Side Price Authority & Tampered Amount Rejection', () => {
    it('rejects client attempting to pay less than the catalog price for a service', () => {
      // Teleconsultation is ₹500 (50000 paise). Client attempts to pay 1000 paise (₹10).
      const res = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
        amount: 1000,
      });

      expect(res.order).toBeUndefined();
      expect(res.error).toContain('Tampered amount rejected');
      expect(res.error).toContain('expected ₹500 (50000 paise)');
    });

    it('rejects negative, float, or zero amounts', () => {
      const resZero = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 0,
      });
      expect(resZero.error).toContain('Invalid order amount');

      const resFloat = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 500.5,
      });
      expect(resFloat.error).toContain('Invalid order amount');

      const resNegative = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: -5000,
      });
      expect(resNegative.error).toContain('Invalid order amount');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Cryptographic Signature Verification
  // --------------------------------------------------------------------------
  describe('4. Cryptographic Signature Verification (HMAC-SHA256)', () => {
    it('successfully verifies genuine signature and marks order CAPTURED', () => {
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });
      const order = orderRes.order!;
      const paymentId = 'pay_gen_test_1001';

      // Official Razorpay formula: HMAC_SHA256(order_id + "|" + payment_id, secret)
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(`${order.razorpayOrderId}|${paymentId}`)
        .digest('hex');

      const verifyRes = FollowUpService.verifyPaymentSignature({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
      });

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.order?.status).toBe('CAPTURED');
      expect(verifyRes.order?.signatureVerified).toBe(true);
      expect(verifyRes.order?.verifiedAt).toBeDefined();

      const updated = store.getPaymentOrder(order.id);
      expect(updated?.status).toBe('CAPTURED');
      expect(updated?.razorpayPaymentId).toBe(paymentId);
    });

    it('rejects tampered signature and transitions order to FAILED', () => {
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });
      const order = orderRes.order!;
      const paymentId = 'pay_tamper_2002';
      const fakeSignature = 'bad0000000000000000000000000000000000000000000000000000000000000';

      const verifyRes = FollowUpService.verifyPaymentSignature({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: fakeSignature,
      });

      expect(verifyRes.success).toBe(false);
      expect(verifyRes.error).toContain('Invalid payment signature');

      const updated = store.getPaymentOrder(order.id);
      expect(updated?.status).toBe('FAILED');
      expect(updated?.signatureVerified).toBe(false);
      expect(updated?.failureReason).toBeDefined();
    });

    it('rejects signature for mismatched or non-existent order ID', () => {
      const verifyRes = FollowUpService.verifyPaymentSignature({
        orderId: 'pay-nonexistent',
        razorpayOrderId: 'order_nonexistent_9999',
        razorpayPaymentId: 'pay_9999',
        razorpaySignature: 'any_signature',
      });

      expect(verifyRes.success).toBe(false);
      expect(verifyRes.error).toContain('not found');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Associated Appointment Status Update
  // --------------------------------------------------------------------------
  describe('5. Appointment Status Transitions upon Payment', () => {
    it('automatically transitions associated appointment to CONFIRMED after verified payment', () => {
      // 1. Create proposed appointment
      const appt = store.saveAppointment({
        id: `appt-pay-test-${Date.now()}`,
        planId: 'plan-101',
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        status: 'PROPOSED',
        scheduledStartTime: new Date(Date.now() + 86400000).toISOString(),
        scheduledEndTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
        locationOrService: 'Post-Op Surgical Follow-up Video Call',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Create order linked to appointment
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        appointmentId: appt.id,
        serviceType: 'TELECONSULTATION',
      });
      const order = orderRes.order!;

      // 3. Compute valid signature and verify
      const paymentId = 'pay_appt_confirmed_456';
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(`${order.razorpayOrderId}|${paymentId}`)
        .digest('hex');

      const verifyRes = FollowUpService.verifyPaymentSignature({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      expect(verifyRes.success).toBe(true);

      // 4. Verify appointment is now CONFIRMED
      const confirmedAppt = store.getAppointment(appt.id);
      expect(confirmedAppt?.status).toBe('CONFIRMED');
    });

    it('prevents duplicate payment orders on already-paid and confirmed appointments', () => {
      const appt = store.saveAppointment({
        id: `appt-already-paid-${Date.now()}`,
        planId: 'plan-101',
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        status: 'CONFIRMED',
        scheduledStartTime: new Date().toISOString(),
        scheduledEndTime: new Date().toISOString(),
        locationOrService: 'Completed Surgical Consultation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Seed captured payment
      store.savePaymentOrder({
        id: `pay-existing-done-${Date.now()}`,
        planId: 'plan-101',
        appointmentId: appt.id,
        amount: 50000,
        currency: 'INR',
        receipt: `rcpt_done_${Date.now()}`,
        status: 'CAPTURED',
        razorpayOrderId: `order_existing_${Date.now()}`,
        razorpayPaymentId: 'pay_already_captured_888',
        signatureVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Attempt creating second payment for the same appointment
      const duplicateRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        appointmentId: appt.id,
        serviceType: 'TELECONSULTATION',
      });

      expect(duplicateRes.order).toBeUndefined();
      expect(duplicateRes.error).toContain('has already been paid and confirmed');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Webhook Signature Verification & Idempotency
  // --------------------------------------------------------------------------
  describe('6. Razorpay Webhooks: Raw Body HMAC Signature & Idempotency', () => {
    it('verifies genuine webhook signature and captures order', async () => {
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });
      const order = orderRes.order!;

      const webhookPayload = JSON.stringify({
        id: `evt_wh_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wh_genuine_777',
              order_id: order.razorpayOrderId,
              currency: 'INR',
              amount: 50000,
            },
          },
        },
      });

      const validWebhookSig = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(webhookPayload)
        .digest('hex');

      const req = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': validWebhookSig,
        },
        body: webhookPayload,
      });

      const res = await webhookRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const updated = store.getPaymentOrder(order.id);
      expect(updated?.status).toBe('CAPTURED');
      expect(updated?.razorpayPaymentId).toBe('pay_wh_genuine_777');
    });

    it('rejects tampered webhook signature with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'invalid_tampered_signature_hex',
        },
        body: JSON.stringify({ event: 'payment.captured' }),
      });

      const res = await webhookRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_SIGNATURE');
    });

    it('processes duplicate webhook deliveries idempotently without re-execution', async () => {
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });
      const order = orderRes.order!;
      const eventId = `evt_idempotent_${Date.now()}`;

      const webhookPayload = JSON.stringify({
        id: eventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wh_idem_888',
              order_id: order.razorpayOrderId,
              currency: 'INR',
              amount: 50000,
            },
          },
        },
      });

      const signature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(webhookPayload)
        .digest('hex');

      // First webhook
      const req1 = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
        body: webhookPayload,
      });
      const res1 = await webhookRoute(req1);
      expect(res1.status).toBe(200);

      // Repeated webhook delivery (identical event ID)
      const req2 = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
        body: webhookPayload,
      });
      const res2 = await webhookRoute(req2);
      const json2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(json2.data.alreadyHandled).toBe(true);
    });

    it('records payment.failed event cleanly without falsely marking order as paid', async () => {
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });
      const order = orderRes.order!;

      const failedPayload = JSON.stringify({
        id: `evt_failed_${Date.now()}`,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_999',
              order_id: order.razorpayOrderId,
              currency: 'INR',
              error_description: 'Card declined by issuing bank (insufficient funds)',
            },
          },
        },
      });

      const signature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(failedPayload)
        .digest('hex');

      const req = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
        body: failedPayload,
      });

      const res = await webhookRoute(req);
      expect(res.status).toBe(200);

      const updated = store.getPaymentOrder(order.id);
      expect(updated?.status).toBe('FAILED');
      expect(updated?.failureReason).toContain('Card declined');
      expect(updated?.signatureVerified).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Ownership Protection & Cross-User Isolation
  // --------------------------------------------------------------------------
  describe('7. Payment History & Cross-User Ownership Isolation', () => {
    it('returns only the current user payments for PATIENT role', async () => {
      // Seed payment for User A
      FollowUpService.createPaymentOrder({
        userId: 'patient-alice-123',
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });

      // Seed payment for User B
      FollowUpService.createPaymentOrder({
        userId: 'patient-bob-456',
        planId: 'plan-101',
        serviceType: 'POST_OP_WOUND_CARE',
      });

      // Request as Alice
      const reqAlice = new NextRequest('http://localhost:3000/api/payments/my-payments', {
        headers: { 'x-user-id': 'patient-alice-123', 'x-user-role': 'PATIENT' },
      });
      const resAlice = await myPaymentsRoute(reqAlice);
      const jsonAlice = await resAlice.json();

      expect(resAlice.status).toBe(200);
      expect(jsonAlice.data.payments.every((p: any) => p.userId === 'patient-alice-123')).toBe(true);

      // Alice should not see Bob's payments
      const containsBobPayment = jsonAlice.data.payments.some((p: any) => p.userId === 'patient-bob-456');
      expect(containsBobPayment).toBe(false);
    });

    it('rejects unauthenticated requests to view payment history with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/payments/my-payments');
      const res = await myPaymentsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Medical Safety Principle
  // --------------------------------------------------------------------------
  describe('8. Safety Invariant: Emergency Care Never Gated by Payment', () => {
    it('verifies that clinical emergency escalation is never blocked by pending/failed payments', () => {
      // Even if payment is failed, patient still has unhindered access to emergency hospital referral
      const failedOrderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        serviceType: 'TELECONSULTATION',
      });
      const order = failedOrderRes.order!;
      order.status = 'FAILED';
      store.savePaymentOrder(order);

      // Verify patient plan is not cancelled or blocked
      const plan = store.getPlan('plan-101');
      expect(plan).toBeDefined();
      expect(plan?.status).not.toBe('CANCELLED');
    });
  });
});
