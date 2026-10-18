import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { FollowUpService } from '../lib/server/followup-service';
import { store } from '../lib/server/store';

describe('FollowUpService Unit & Hardening Tests (Phase 3)', () => {
  beforeEach(() => {
    process.env.PAYMENTS_ENABLED = 'true';
    process.env.RAZORPAY_KEY_SECRET = 'test_followup_service_secret_12345';
  });

  describe('Safety Escalation & Missing Risk Invariants', () => {
    it('successfully creates a follow-up plan for a stable patient (pat-101)', () => {
      const result = FollowUpService.createPlan({
        patientId: 'pat-101',
        title: 'Post-CABG 3-Week Cardiology Review',
        clinicalSummary: 'Check recovery vitals, incision healing, and medication tolerance.',
        startDate: '2026-10-25T10:00:00Z',
        approvedByClinician: 'Dr. V. K. Ramanathan',
      });

      expect(result.error).toBeUndefined();
      expect(result.plan).toBeDefined();
      expect(result.plan?.patientId).toBe('pat-101');
      expect(result.plan?.status).toBe('ACTIVE');
    });

    it('strictly suppresses routine follow-up plan creation for an escalated high-risk patient (pat-103)', () => {
      const result = FollowUpService.createPlan({
        patientId: 'pat-103', // Sunita Devi - High Risk / Biliary Complication
        title: 'Routine Post-Op Check',
        clinicalSummary: 'Attempt routine remote booking',
        startDate: '2026-10-22T10:00:00Z',
      });

      expect(result.plan).toBeUndefined();
      expect(result.isEscalated).toBe(true);
      expect(result.error).toContain('CRITICAL CLINICAL ESCALATION');
    });

    it('does NOT silently treat missing risk data as safe - requires explicit clinician sign-off', () => {
      // Create a temporary synthetic patient with NO risk assessment
      const unassessedPatientId = 'pat-unassessed-99';
      store['patients'].set(unassessedPatientId, {
        id: unassessedPatientId,
        mrn: 'MRN-UNASSESSED',
        name: 'Test Unassessed Patient',
        age: 50,
        gender: 'Male',
        homeCity: 'Cuttack',
        homeState: 'Odisha',
        homePincode: '753001',
        contactPhone: '+91 99999 11111',
        surgeryProcedure: 'Appendectomy',
        operatingHospital: 'Apollo Hospital',
        surgeonName: 'Dr. Test Surgeon',
        dischargeDate: '2026-10-15T10:00:00Z',
      });

      // Attempt creating plan without clinician approval
      const unapprovedRes = FollowUpService.createPlan({
        patientId: unassessedPatientId,
        title: 'Unreviewed Follow-Up',
        clinicalSummary: 'Test summary',
        startDate: '2026-10-22T10:00:00Z',
      });
      expect(unapprovedRes.plan).toBeUndefined();
      expect(unapprovedRes.error).toContain('RISK DATA UNAVAILABLE');

      // Create plan WITH clinician approval
      const approvedRes = FollowUpService.createPlan({
        patientId: unassessedPatientId,
        title: 'Clinician-Reviewed Follow-Up',
        clinicalSummary: 'Test summary',
        startDate: '2026-10-22T10:00:00Z',
        approvedByClinician: 'Dr. Test Surgeon',
      });
      expect(approvedRes.plan).toBeDefined();
      expect(approvedRes.plan?.status).toBe('ACTIVE');
    });

    it('returns error when patient does not exist in registry', () => {
      const result = FollowUpService.createPlan({
        patientId: 'non-existent-patient-404',
        title: 'Invalid Plan',
        clinicalSummary: 'Test summary',
        startDate: '2026-10-22T10:00:00Z',
      });

      expect(result.plan).toBeUndefined();
      expect(result.error).toContain('does not exist in registry');
    });
  });

  describe('Appointment Scheduling, Validation & Duplicate Prevention', () => {
    let testPlanId: string;

    beforeEach(() => {
      const planRes = FollowUpService.createPlan({
        patientId: 'pat-101',
        title: 'Test Follow-Up Plan',
        clinicalSummary: 'Test Summary',
        startDate: '2026-10-20T10:00:00Z',
        approvedByClinician: 'Dr. V. K. Ramanathan',
      });
      testPlanId = planRes.plan!.id;
    });

    it('successfully schedules a teleconsultation appointment and auto-provisions a zero-PII Jitsi session', () => {
      const result = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        scheduledStartTime: '2026-10-22T14:00:00Z',
        scheduledEndTime: '2026-10-22T14:30:00Z',
        locationOrService: 'Encrypted Teleconsultation Suite',
        clinicalNotes: 'Check incision healing photos',
      });

      expect(result.error).toBeUndefined();
      expect(result.appointment).toBeDefined();
      expect(result.appointment?.status).toBe('CONFIRMED');

      const session = store.getTeleSessionByAppointment(result.appointment!.id);
      expect(session).toBeDefined();
      expect(session?.roomName).toMatch(/^tfo-sess-[a-f0-9]{32}$/);
      expect(session?.roomName).not.toContain('Rajesh');
      expect(session?.roomName).not.toContain('CABG');
    });

    it('rejects scheduling when start time is after end time', () => {
      const result = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'LOCAL_CLINIC_VISIT',
        scheduledStartTime: '2026-10-22T15:00:00Z',
        scheduledEndTime: '2026-10-22T14:00:00Z', // Invalid end time
        locationOrService: 'Apex Clinic',
      });

      expect(result.appointment).toBeUndefined();
      expect(result.error).toContain('start time must be chronologically before end time');
    });

    it('prevents scheduling duplicate overlapping appointments of the same type', () => {
      const first = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        scheduledStartTime: '2026-10-28T10:00:00Z',
        scheduledEndTime: '2026-10-28T10:30:00Z',
        locationOrService: 'Video Suite',
      });
      expect(first.appointment).toBeDefined();

      // Attempt duplicate booking for overlapping slot
      const duplicate = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        scheduledStartTime: '2026-10-28T10:15:00Z',
        scheduledEndTime: '2026-10-28T10:45:00Z',
        locationOrService: 'Video Suite',
      });

      expect(duplicate.appointment).toBeUndefined();
      expect(duplicate.error).toContain('Schedule Conflict: An overlapping');
    });

    it('enforces cancellation reason when cancelling an appointment', () => {
      const apptRes = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'LOCAL_CLINIC_VISIT',
        scheduledStartTime: '2026-10-29T10:00:00Z',
        scheduledEndTime: '2026-10-29T10:30:00Z',
        locationOrService: 'Clinic #1',
      });
      const apptId = apptRes.appointment!.id;

      // Cancel without reason
      const cancelWithoutReason = FollowUpService.updateAppointmentStatus(apptId, 'CANCELLED');
      expect(cancelWithoutReason.error).toContain('cancellation reason');

      // Cancel with valid reason
      const cancelWithReason = FollowUpService.updateAppointmentStatus(apptId, 'CANCELLED', {
        cancellationReason: 'Patient feeling well, deferred to 4-week check',
      });
      expect(cancelWithReason.error).toBeUndefined();
      expect(cancelWithReason.appointment?.status).toBe('CANCELLED');
    });

    it('disallows modifying an appointment that is already in terminal CANCELLED or COMPLETED status', () => {
      const apptRes = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'LOCAL_CLINIC_VISIT',
        scheduledStartTime: '2026-10-30T10:00:00Z',
        scheduledEndTime: '2026-10-30T10:30:00Z',
        locationOrService: 'Clinic #2',
      });
      const apptId = apptRes.appointment!.id;

      FollowUpService.updateAppointmentStatus(apptId, 'CANCELLED', {
        cancellationReason: 'Cancelled test',
      });

      // Attempt reschedule on cancelled appointment
      const attemptReschedule = FollowUpService.updateAppointmentStatus(apptId, 'RESCHEDULED', {
        newStartTime: '2026-10-31T10:00:00Z',
        newEndTime: '2026-10-31T10:30:00Z',
      });
      expect(attemptReschedule.error).toContain('Cannot modify a terminal');
    });

    it('records a clinical consultation outcome and marks appointment COMPLETED', () => {
      const apptRes = FollowUpService.createAppointment({
        planId: testPlanId,
        patientId: 'pat-101',
        type: 'TELECONSULTATION',
        scheduledStartTime: '2026-11-01T10:00:00Z',
        scheduledEndTime: '2026-11-01T10:30:00Z',
        locationOrService: 'Teleconsultation Suite',
      });
      const apptId = apptRes.appointment!.id;

      const outcomeRes = FollowUpService.recordConsultationOutcome({
        appointmentId: apptId,
        clinicianId: 'Dr. V. K. Ramanathan',
        subjectiveNotes: 'Patient reports mild sternal soreness on deep cough, no rest pain, no fever.',
        objectiveFindings: 'Incision well-approximated via video check, no discharge.',
        assessmentPlan: 'Continue aspirin and metoprolol. Cleared for light walking.',
        followUpRequired: false,
      });

      expect(outcomeRes.error).toBeUndefined();
      expect(outcomeRes.record).toBeDefined();

      const updatedAppt = store.getAppointment(apptId);
      expect(updatedAppt?.status).toBe('COMPLETED');
    });
  });

  describe('Razorpay Timing-Safe HMAC-SHA256 Signature Verification', () => {
    it('correctly validates genuine HMAC-SHA256 signature and captures order', () => {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 50000, // ₹500
      });
      const order = orderRes.order!;
      const paymentId = 'pay_sandbox_genuine_9988';

      // Compute exact real HMAC-SHA256
      const genuineSignature = crypto
        .createHmac('sha256', secret)
        .update(`${order.razorpayOrderId}|${paymentId}`)
        .digest('hex');

      const verifyRes = FollowUpService.verifyPaymentSignature({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: genuineSignature,
      });

      expect(verifyRes.success).toBe(true);
      const captured = store.getPaymentOrder(order.id);
      expect(captured?.status).toBe('CAPTURED');
      expect(captured?.razorpayPaymentId).toBe(paymentId);
    });

    it('rejects tampered or forged signatures using timing-safe comparison', () => {
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 35000,
      });
      const order = orderRes.order!;

      const tamperedVerify = FollowUpService.verifyPaymentSignature({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: 'pay_tampered_1234',
        razorpaySignature: 'deadbeefcafebabe00112233445566778899aabbccddeeff0011223344556677',
      });

      expect(tamperedVerify.success).toBe(false);
      expect(tamperedVerify.error).toContain('Invalid payment signature');

      const failedOrder = store.getPaymentOrder(order.id);
      expect(failedOrder?.status).toBe('FAILED');
    });

    it('handles idempotent capture verification when already captured', () => {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
      const orderRes = FollowUpService.createPaymentOrder({
        planId: 'plan-101',
        amount: 25000,
      });
      const order = orderRes.order!;
      const paymentId = 'pay_idempotent_test';

      const genuineSignature = crypto
        .createHmac('sha256', secret)
        .update(`${order.razorpayOrderId}|${paymentId}`)
        .digest('hex');

      // First verification
      const first = FollowUpService.verifyPaymentSignature({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: genuineSignature,
      });
      expect(first.success).toBe(true);

      // Duplicate / retry verification
      const second = FollowUpService.verifyPaymentSignature({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: genuineSignature,
      });
      expect(second.success).toBe(true);
      expect(second.alreadyCaptured).toBe(true);
    });
  });

  describe('Notification Reliability & Deduplication', () => {
    it('prevents duplicate notification delivery within short intervals', () => {
      const recipientId = 'pat-notif-test';
      const title = 'Duplicate Test Alert';
      const message = 'Please log your daily vitals';

      FollowUpService.sendNotificationSafely({
        recipientUserId: recipientId,
        type: 'CLINICAL_ALERT',
        title,
        message,
      });

      const initialCount = store.getNotifications(recipientId).length;
      expect(initialCount).toBe(1);

      // Attempt identical notification immediately
      FollowUpService.sendNotificationSafely({
        recipientUserId: recipientId,
        type: 'CLINICAL_ALERT',
        title,
        message,
      });

      const secondCount = store.getNotifications(recipientId).length;
      expect(secondCount).toBe(1); // Deduped!
    });
  });
});
