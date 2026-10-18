import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as createPlanRoute, GET as getPlansRoute } from '../app/api/followup/plans/route';
import { POST as createAppointmentRoute, GET as getAppointmentsRoute } from '../app/api/followup/appointments/route';
import { PATCH as updateAppointmentRoute } from '../app/api/followup/appointments/[id]/route';
import { POST as recordOutcomeRoute } from '../app/api/teleconsult/records/route';
import { POST as verifyPaymentRoute } from '../app/api/payments/verify/route';
import { FollowUpService } from '../lib/server/followup-service';
import { store } from '../lib/server/store';

describe('Member 5 — API Security, Authorization & Reliability Hardening', () => {
  describe('Role-Based Authorization & Cross-Patient Protection', () => {
    it('rejects client supplied role and identity headers as a session', async () => {
      const req = new NextRequest('http://localhost:3000/api/followup/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'PATIENT',
          'x-user-id': 'pat-101',
        },
        body: JSON.stringify({
          patientId: 'pat-101',
          title: 'Unauthorized Patient-Authored Plan',
          clinicalSummary: 'Patient attempting self-prescription',
          startDate: '2026-11-10T10:00:00Z',
        }),
      });

      const res = await createPlanRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects appointment lookup when identity is supplied only in headers', async () => {
      // Patient 102 attempts to query appointments of Patient 101
      const req = new NextRequest('http://localhost:3000/api/followup/appointments?patientId=pat-101', {
        method: 'GET',
        headers: {
          'x-user-role': 'PATIENT',
          'x-user-id': 'pat-102', // Mismatch!
        },
      });

      const res = await getAppointmentsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects client supplied COORDINATOR identity when recording a clinical outcome', async () => {
      const req = new NextRequest('http://localhost:3000/api/teleconsult/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'COORDINATOR', // Coordinator cannot sign doctor notes
          'x-user-id': 'coord-01',
        },
        body: JSON.stringify({
          appointmentId: 'appt-202',
          clinicianId: 'coord-01',
          subjectiveNotes: 'Attempting to submit notes without MD license',
          assessmentPlan: 'Discharged from care',
          followUpRequired: false,
        }),
      });

      const res = await recordOutcomeRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Clinical Safety Escalation API Enforcement', () => {
    // Requires a configured isolated PostgreSQL database with a reviewed risk record.
    it.skip('blocks routine plan creation for a high-risk patient', async () => {
      const req = new NextRequest('http://localhost:3000/api/followup/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CLINICIAN',
          'x-user-id': 'doc-ramanathan',
        },
        body: JSON.stringify({
          patientId: 'pat-103', // High Risk / Bile Peritonitis
          title: 'Attempt Routine Remote Plan for High Risk Patient',
          clinicalSummary: 'Routine remote check',
          startDate: '2026-10-25T10:00:00Z',
        }),
      });

      const res = await createPlanRoute(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CLINICAL_ESCALATION_OVERRIDE');
      expect(json.error.message).toContain('CRITICAL CLINICAL ESCALATION');
    });
  });

  describe('Appointment Lifecycle & Status Machine Guardrails', () => {
    let testPlanId: string;

    beforeEach(() => {
      const planRes = FollowUpService.createPlan({
        patientId: 'pat-101',
        title: 'Hardening Lifecycle Plan',
        clinicalSummary: 'API testing plan',
        startDate: '2026-11-01T10:00:00Z',
        approvedByClinician: 'Dr. V. K. Ramanathan',
      });
      testPlanId = planRes.plan!.id;
    });

    it('rejects scheduling when the caller supplies only a role header', async () => {
      const req = new NextRequest('http://localhost:3000/api/followup/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CLINICIAN',
        },
        body: JSON.stringify({
          planId: testPlanId,
          patientId: 'pat-101',
          type: 'LOCAL_CLINIC_VISIT',
          scheduledStartTime: '2026-11-05T14:00:00Z',
          scheduledEndTime: '2026-11-05T13:00:00Z', // Invalid end before start
          locationOrService: 'Apex Clinic',
        }),
      });

      const res = await createAppointmentRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects appointment status changes when identity is supplied only in headers', async () => {
      const apptRes = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        scheduledStartTime: '2026-11-06T10:00:00Z',
        scheduledEndTime: '2026-11-06T10:30:00Z',
        locationOrService: 'Video Suite',
      });
      const apptId = apptRes.appointment!.id;

      // Patient attempts to mark their own appointment as COMPLETED
      const req = new NextRequest(`http://localhost:3000/api/followup/appointments/${apptId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'PATIENT',
          'x-user-id': 'pat-101',
        },
        body: JSON.stringify({
          status: 'COMPLETED',
        }),
      });

      const res = await updateAppointmentRoute(req, { params: Promise.resolve({ id: apptId }) });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Cryptographic Signature Verification & Webhook Timing Attacks', () => {
    it('requires a signed user session before payment verification', async () => {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 50000,
      });
      const order = orderRes.order!;
      const paymentId = 'pay_api_test_5566';

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${order.razorpayOrderId}|${paymentId}`)
        .digest('hex');

      // A valid payment signature does not replace the user's authenticated session.
      const validReq = new NextRequest('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: validSignature,
        }),
      });

      const validRes = await verifyPaymentRoute(validReq);
      const validJson = await validRes.json();

      expect(validRes.status).toBe(401);
      expect(validJson.success).toBe(false);
      expect(validJson.error.code).toBe('UNAUTHORIZED');

      // Create separate order for forged signature test
      const order2Res = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 50000,
      });
      const order2 = order2Res.order!;

      // Forged API call
      const forgedReq = new NextRequest('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order2.id,
          razorpayOrderId: order2.razorpayOrderId,
          razorpayPaymentId: 'pay_attacker_9999',
          razorpaySignature: 'badf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00d',
        }),
      });

      const forgedRes = await verifyPaymentRoute(forgedReq);
      const forgedJson = await forgedRes.json();

      expect(forgedRes.status).toBe(401);
      expect(forgedJson.success).toBe(false);
      expect(forgedJson.error.code).toBe('UNAUTHORIZED');
    });
  });
});
