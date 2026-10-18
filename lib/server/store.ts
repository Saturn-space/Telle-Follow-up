import {
  FollowUpPlan,
  Appointment,
  TeleconsultationSession,
  ConsultationRecord,
  PaymentOrder,
  NotificationItem,
  Patient,
  RiskAssessment,
  Provider,
  TravelComparison,
} from '@/lib/types/followup';
import {
  SYNTHETIC_PATIENTS,
  SYNTHETIC_RISK_ASSESSMENTS,
  SYNTHETIC_PROVIDERS,
  SYNTHETIC_TRAVEL_COMPARISONS,
} from '@/lib/server/mock-data';

// ==========================================
// THREAD-SAFE IN-MEMORY DATA STORE
// (Simulates PostgreSQL/Prisma relations for runtime)
// ==========================================

class TeleFollowUpDataStore {
  private patients: Map<string, Patient> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private providers: Map<string, Provider> = new Map();
  private travelComparisons: Map<string, TravelComparison> = new Map();

  private plans: Map<string, FollowUpPlan> = new Map();
  private appointments: Map<string, Appointment> = new Map();
  private teleSessions: Map<string, TeleconsultationSession> = new Map();
  private consultationRecords: Map<string, ConsultationRecord> = new Map();
  private paymentOrders: Map<string, PaymentOrder> = new Map();
  private notifications: Map<string, NotificationItem> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed Members 1-4 stubs
    SYNTHETIC_PATIENTS.forEach((p) => this.patients.set(p.id, p));
    SYNTHETIC_RISK_ASSESSMENTS.forEach((r) => this.riskAssessments.set(r.id, r));
    SYNTHETIC_PROVIDERS.forEach((pv) => this.providers.set(pv.id, pv));
    SYNTHETIC_TRAVEL_COMPARISONS.forEach((t) => this.travelComparisons.set(t.id, t));

    // Seed Member 5 initial Follow-Up Plan for Rajesh Sharma (pat-101)
    const initialPlanId = 'plan-101';
    const plan1: FollowUpPlan = {
      id: initialPlanId,
      patientId: 'pat-101',
      riskAssessmentId: 'risk-101',
      travelComparisonId: 'trav-101',
      title: 'Post-CABG Day 14 Follow-Up & Cardiac Teleconsult',
      clinicalSummary:
        'Coordinate local resting 12-lead ECG and basic metabolic panel at verified clinic, followed by high-definition teleconsultation with operating cardiac surgeon to review wound healing and titrate beta-blockers.',
      status: 'ACTIVE',
      approvedByClinician: 'Dr. V. K. Ramanathan (Senior Cardiothoracic Surgeon)',
      approvedAt: '2026-10-16T15:30:00Z',
      startDate: '2026-10-19T09:00:00Z',
      targetCompletionDate: '2026-10-21T17:00:00Z',
      createdAt: '2026-10-16T15:30:00Z',
      updatedAt: '2026-10-16T15:30:00Z',
    };
    this.plans.set(initialPlanId, plan1);

    // Seed Appointments under plan-101
    const appt1Id = 'appt-201';
    const appt1: Appointment = {
      id: appt1Id,
      planId: initialPlanId,
      patientId: 'pat-101',
      providerId: 'prov-02',
      type: 'DIAGNOSTIC_LAB',
      status: 'CONFIRMED',
      scheduledStartTime: '2026-10-19T09:30:00Z',
      scheduledEndTime: '2026-10-19T10:15:00Z',
      locationOrService: 'Apollo Diagnostics Centre — Saheed Nagar (ECG & Serum Electrolytes)',
      clinicalNotes: 'Perform standard 12-lead ECG; inspect sternal incision dressing.',
      createdAt: '2026-10-16T15:45:00Z',
      updatedAt: '2026-10-16T15:45:00Z',
    };
    this.appointments.set(appt1Id, appt1);

    const appt2Id = 'appt-202';
    const appt2: Appointment = {
      id: appt2Id,
      planId: initialPlanId,
      patientId: 'pat-101',
      type: 'TELECONSULTATION',
      status: 'CONFIRMED',
      scheduledStartTime: '2026-10-20T11:00:00Z',
      scheduledEndTime: '2026-10-20T11:30:00Z',
      locationOrService: 'Secure Jitsi Teleconsultation Suite (Encrypted Video)',
      clinicalNotes: 'Review ECG telemetry, wound photo, and discuss return-to-work timeline.',
      createdAt: '2026-10-16T16:00:00Z',
      updatedAt: '2026-10-16T16:00:00Z',
    };
    this.appointments.set(appt2Id, appt2);

    // Seed Teleconsultation Session for appt2 (Opaque non-PII room name)
    const sessionId = 'tele-301';
    const session: TeleconsultationSession = {
      id: sessionId,
      planId: initialPlanId,
      appointmentId: appt2Id,
      roomName: 'tfo-sess-a94f83b1-72ec-412e-9d21-4f183c2a0011',
      domain: process.env.JITSI_DOMAIN || 'meet.jit.si',
      status: 'READY',
      createdAt: '2026-10-16T16:05:00Z',
      updatedAt: '2026-10-16T16:05:00Z',
    };
    this.teleSessions.set(sessionId, session);

    // Seed Initial Notifications
    const notif1: NotificationItem = {
      id: 'notif-01',
      recipientUserId: 'pat-101',
      type: 'PLAN_UPDATED',
      title: 'Follow-Up Care Plan Approved',
      message: 'Dr. V. K. Ramanathan approved your hybrid follow-up plan. View scheduled appointments.',
      read: false,
      deliveryStatus: 'SIMULATED',
      linkUrl: '/?tab=plans',
      createdAt: '2026-10-16T15:35:00Z',
    };
    const notif2: NotificationItem = {
      id: 'notif-02',
      recipientUserId: 'pat-101',
      type: 'TELECONSULT_LINK_READY',
      title: 'Teleconsultation Room Ready',
      message: 'Your video room for Oct 20 at 11:00 AM has been provisioned.',
      read: false,
      deliveryStatus: 'SIMULATED',
      linkUrl: '/?tab=teleconsult',
      createdAt: '2026-10-16T16:05:00Z',
    };
    this.notifications.set(notif1.id, notif1);
    this.notifications.set(notif2.id, notif2);
  }

  // ==========================================
  // PATIENT / RISK / PROVIDER / TRAVEL READERS
  // ==========================================

  getPatient(id: string): Patient | undefined {
    return this.patients.get(id);
  }

  getAllPatients(): Patient[] {
    return Array.from(this.patients.values());
  }

  getRiskAssessmentByPatient(patientId: string): RiskAssessment | undefined {
    return Array.from(this.riskAssessments.values()).find((r) => r.patientId === patientId);
  }

  getTravelComparisonByPatient(patientId: string): TravelComparison | undefined {
    return Array.from(this.travelComparisons.values()).find((t) => t.patientId === patientId);
  }

  getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  // ==========================================
  // FOLLOW-UP PLANS
  // ==========================================

  getPlan(id: string): FollowUpPlan | undefined {
    const plan = this.plans.get(id);
    if (!plan) return undefined;
    return {
      ...plan,
      appointments: this.getAppointmentsByPlan(id),
    };
  }

  getAllPlans(patientId?: string): FollowUpPlan[] {
    const list = Array.from(this.plans.values());
    const filtered = patientId ? list.filter((p) => p.patientId === patientId) : list;
    return filtered.map((p) => ({
      ...p,
      appointments: this.getAppointmentsByPlan(p.id),
    }));
  }

  savePlan(plan: FollowUpPlan): FollowUpPlan {
    this.plans.set(plan.id, plan);
    return plan;
  }

  // ==========================================
  // APPOINTMENTS
  // ==========================================

  getAppointment(id: string): Appointment | undefined {
    const appt = this.appointments.get(id);
    if (!appt) return undefined;
    const teleSession = Array.from(this.teleSessions.values()).find((s) => s.appointmentId === id);
    const outcomeRecord = this.consultationRecords.get(id);
    return {
      ...appt,
      teleSession,
      outcomeRecord,
    };
  }

  getAppointmentsByPlan(planId: string): Appointment[] {
    return Array.from(this.appointments.values())
      .filter((a) => a.planId === planId)
      .map((a) => {
        const teleSession = Array.from(this.teleSessions.values()).find((s) => s.appointmentId === a.id);
        const outcomeRecord = this.consultationRecords.get(a.id);
        return { ...a, teleSession, outcomeRecord };
      });
  }

  getAppointmentsByPatient(patientId: string): Appointment[] {
    return Array.from(this.appointments.values())
      .filter((a) => a.patientId === patientId)
      .map((a) => {
        const teleSession = Array.from(this.teleSessions.values()).find((s) => s.appointmentId === a.id);
        const outcomeRecord = this.consultationRecords.get(a.id);
        return { ...a, teleSession, outcomeRecord };
      });
  }

  saveAppointment(appt: Appointment): Appointment {
    this.appointments.set(appt.id, appt);
    return appt;
  }

  // ==========================================
  // TELECONSULTATION SESSIONS & RECORDS
  // ==========================================

  getTeleSession(id: string): TeleconsultationSession | undefined {
    return this.teleSessions.get(id);
  }

  getTeleSessionByAppointment(appointmentId: string): TeleconsultationSession | undefined {
    return Array.from(this.teleSessions.values()).find((s) => s.appointmentId === appointmentId);
  }

  saveTeleSession(session: TeleconsultationSession): TeleconsultationSession {
    this.teleSessions.set(session.id, session);
    return session;
  }

  getConsultationRecord(appointmentId: string): ConsultationRecord | undefined {
    return this.consultationRecords.get(appointmentId);
  }

  saveConsultationRecord(record: ConsultationRecord): ConsultationRecord {
    this.consultationRecords.set(record.appointmentId, record);
    return record;
  }

  // ==========================================
  // PAYMENT ORDERS
  // ==========================================

  getPaymentOrder(id: string): PaymentOrder | undefined {
    return this.paymentOrders.get(id);
  }

  getPaymentOrderByRazorpayId(rzpOrderId: string): PaymentOrder | undefined {
    return Array.from(this.paymentOrders.values()).find((p) => p.razorpayOrderId === rzpOrderId);
  }

  getPaymentOrderByPaymentId(rzpPaymentId: string): PaymentOrder | undefined {
    return Array.from(this.paymentOrders.values()).find((p) => p.razorpayPaymentId === rzpPaymentId);
  }

  getPaymentOrderByWebhookEventId(webhookEventId: string): PaymentOrder | undefined {
    return Array.from(this.paymentOrders.values()).find((p) => p.webhookEventId === webhookEventId);
  }

  getPaymentOrdersByUser(userId: string): PaymentOrder[] {
    return Array.from(this.paymentOrders.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllPaymentOrders(planId?: string): PaymentOrder[] {
    const list = Array.from(this.paymentOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return planId ? list.filter((p) => p.planId === planId) : list;
  }

  savePaymentOrder(order: PaymentOrder): PaymentOrder {
    this.paymentOrders.set(order.id, order);
    return order;
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  getNotifications(recipientUserId?: string): NotificationItem[] {
    const list = Array.from(this.notifications.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return recipientUserId ? list.filter((n) => n.recipientUserId === recipientUserId) : list;
  }

  saveNotification(item: NotificationItem): NotificationItem {
    this.notifications.set(item.id, item);
    return item;
  }

  markNotificationRead(id: string): boolean {
    const item = this.notifications.get(id);
    if (item) {
      item.read = true;
      this.notifications.set(id, item);
      return true;
    }
    return false;
  }
}

// Global singleton instance
const globalForStore = globalThis as unknown as { teleFollowUpStore?: TeleFollowUpDataStore };

export const store = globalForStore.teleFollowUpStore ?? new TeleFollowUpDataStore();
if (process.env.NODE_ENV !== 'production') globalForStore.teleFollowUpStore = store;
