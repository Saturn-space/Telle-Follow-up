import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { store } from '../lib/server/store';
import { FollowUpService } from '../lib/server/followup-service';

describe('Member 5 — End-to-End Workflow Verification & Release Demo', () => {
  it('executes the full end-to-end follow-up coordination lifecycle for a stable patient', () => {
    // 1. Step 1 (M1): Verify synthetic patient and surgery record
    const patient = store.getPatient('pat-101');
    expect(patient).toBeDefined();
    expect(patient?.name).toBe('Rajesh Sharma');
    expect(patient?.operatingHospital).toContain('Apollo');

    // 2. Step 2 (M2): Verify risk assessment
    const risk = store.getRiskAssessmentByPatient('pat-101');
    expect(risk).toBeDefined();
    expect(risk?.riskTier).toBe('LOW');
    expect(risk?.reviewedByDoctor).toBe(true);

    // 3. Step 3 (M3): Verify local healthcare provider
    const providers = store.getAllProviders();
    expect(providers.length).toBeGreaterThan(0);
    const localClinic = providers.find((p) => p.city === patient?.homeCity);
    expect(localClinic).toBeDefined();
    expect(localClinic?.verificationStatus).toBe('VERIFIED');

    // 4. Step 4 (M4): Verify travel comparison
    const travel = store.getTravelComparisonByPatient('pat-101');
    expect(travel).toBeDefined();
    expect(travel?.isEscalated).toBe(false);
    expect(travel?.estimatedCostInr).toBeGreaterThan(10000);

    // 5. Step 5 (M5): Clinician approves follow-up plan
    const planRes = FollowUpService.createPlan({
      patientId: 'pat-101',
      title: 'E2E Post-CABG Hybrid Follow-Up Plan',
      clinicalSummary: 'Local resting ECG + teleconsultation with cardiac surgical team.',
      startDate: '2026-11-15T09:00:00Z',
      approvedByClinician: 'Dr. V. K. Ramanathan',
    });
    expect(planRes.error).toBeUndefined();
    expect(planRes.plan).toBeDefined();
    expect(planRes.plan?.status).toBe('ACTIVE');
    const planId = planRes.plan!.id;

    // 6. Step 6A (M5): Schedule local in-person visit with Member 3 clinic
    const localApptRes = FollowUpService.createAppointment({
      planId,
      patientId: 'pat-101',
      type: 'LOCAL_CLINIC_VISIT',
      providerId: localClinic!.id,
      scheduledStartTime: '2026-11-16T10:00:00Z',
      scheduledEndTime: '2026-11-16T10:30:00Z',
      locationOrService: localClinic!.name,
      clinicalNotes: 'Inspect sternal incision and obtain 12-lead ECG.',
    });
    expect(localApptRes.error).toBeUndefined();
    expect(localApptRes.appointment).toBeDefined();
    expect(localApptRes.appointment?.providerId).toBe(localClinic!.id);

    // 7. Step 6B (M5): Schedule teleconsultation with auto-provisioned zero-PII room
    const teleApptRes = FollowUpService.createAppointment({
      planId,
      patientId: 'pat-101',
      type: 'TELECONSULTATION',
      scheduledStartTime: '2026-11-17T14:00:00Z',
      scheduledEndTime: '2026-11-17T14:30:00Z',
      locationOrService: 'Encrypted Teleconsultation Suite',
      clinicalNotes: 'Review ECG telemetry and incision scar video feed.',
    });
    expect(teleApptRes.error).toBeUndefined();
    expect(teleApptRes.appointment).toBeDefined();
    const teleApptId = teleApptRes.appointment!.id;

    // Verify Jitsi room name is random UUID with ZERO PII
    const session = store.getTeleSessionByAppointment(teleApptId);
    expect(session).toBeDefined();
    expect(session?.roomName).toMatch(/^tfo-sess-[a-f0-9]{32}$/);
    expect(session?.roomName).not.toContain('Rajesh');

    // 8. Step 7 (M5): Clinician conducts consultation, records outcome notes, and marks appointment COMPLETED
    const outcomeRes = FollowUpService.recordConsultationOutcome({
      appointmentId: teleApptId,
      teleSessionId: session?.id,
      clinicianId: 'Dr. V. K. Ramanathan',
      subjectiveNotes: 'Patient feels strong, no dyspnea on exertion.',
      objectiveFindings: 'Incision healed per primam, resting ECG normal sinus rhythm 74 bpm.',
      assessmentPlan: 'Continue regular aspirin; cleared for light office work.',
      followUpRequired: false,
    });
    expect(outcomeRes.error).toBeUndefined();
    expect(outcomeRes.record).toBeDefined();

    // Verify appointment status transitioned to COMPLETED
    const completedAppt = store.getAppointment(teleApptId);
    expect(completedAppt?.status).toBe('COMPLETED');

    // 9. Step 8 (M5): Verify notification delivery status is strictly transparent (SIMULATED)
    const notifs = store.getNotifications('pat-101');
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0].deliveryStatus).toBe('SIMULATED');
  });

  it('guarantees that emergency clinical escalation strictly blocks non-emergency scheduling', () => {
    // Patient pat-103 exhibits acute biliary peritonitis
    const patient = store.getPatient('pat-103');
    expect(patient).toBeDefined();

    const risk = store.getRiskAssessmentByPatient('pat-103');
    expect(risk?.riskTier).toBe('HIGH');

    // Attempting to create routine follow-up plan is rejected with critical escalation override
    const escalationRes = FollowUpService.createPlan({
      patientId: 'pat-103',
      title: 'Routine Remote Follow-Up',
      clinicalSummary: 'Patient wants teleconsultation instead of going to hospital',
      startDate: '2026-11-20T10:00:00Z',
    });

    expect(escalationRes.plan).toBeUndefined();
    expect(escalationRes.isEscalated).toBe(true);
    expect(escalationRes.error).toContain('CRITICAL CLINICAL ESCALATION');
  });

  it('verifies that optional Razorpay payments support sandbox order creation and never gate clinical care', () => {
    // 1. Order creation generates valid sandbox order structure
    const orderRes = FollowUpService.createPaymentOrder({
      planId: 'plan-101',
      amount: 50000, // ₹500
    });

    expect(orderRes.order).toBeDefined();
    expect(orderRes.order?.currency).toBe('INR');
    expect(orderRes.order?.amount).toBe(50000);
    expect(orderRes.order?.razorpayOrderId).toMatch(/^order_[a-f0-9]{16}$/);

    // 2. CRITICAL SAFETY INVARIANT: Clinical care & emergency escalation are never gated by payment status
    // Even if a payment order fails or is pending, high-risk patient pat-103 still triggers immediate hospital escalation
    const highRiskPlanRes = FollowUpService.createPlan({
      patientId: 'pat-103',
      title: 'High Risk Attempt After Payment',
      clinicalSummary: 'Emergency care cannot be replaced by payment',
      startDate: '2026-11-20T10:00:00Z',
    });
    expect(highRiskPlanRes.isEscalated).toBe(true);
    expect(highRiskPlanRes.error).toContain('CRITICAL CLINICAL ESCALATION');
  });
});
