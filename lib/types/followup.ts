import { z } from 'zod';

// ==========================================
// UNIFIED API ENVELOPE
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// ==========================================
// ENUMS & LITERALS
// ==========================================

export type UserRole = 'PATIENT' | 'CLINICIAN' | 'COORDINATOR' | 'ADMIN';

export type FollowUpPlanStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export type AppointmentType =
  | 'TELECONSULTATION'
  | 'LOCAL_CLINIC_VISIT'
  | 'HOSPITAL_RETURN'
  | 'DIAGNOSTIC_LAB';

export type AppointmentStatus =
  | 'PROPOSED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type TeleSessionStatus =
  | 'PENDING'
  | 'READY'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export type PaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export type NotificationType =
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_REMINDER'
  | 'TELECONSULT_LINK_READY'
  | 'PLAN_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'CLINICAL_ALERT';

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export type VerificationStatus = 'VERIFIED' | 'SEEDED_DEMO' | 'UNVERIFIED';

// ==========================================
// DOMAIN ENTITIES
// ==========================================

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  homeCity: string;
  homeState: string;
  homePincode: string;
  contactPhone: string;
  surgeryProcedure: string;
  operatingHospital: string;
  surgeonName: string;
  dischargeDate: string;
}

export interface RiskAssessment {
  id: string;
  patientId: string;
  riskTier: RiskTier;
  riskScore: number;
  summaryRationale: string;
  clinicalRedFlags: string[];
  reviewedByDoctor: boolean;
  doctorNotes?: string;
  assessedAt: string;
}

export interface Provider {
  id: string;
  name: string;
  facilityType: string;
  city: string;
  state: string;
  distanceKm: number;
  verificationStatus: VerificationStatus;
  servicesOffered: string[];
  contactPhone: string;
}

export interface TravelComparison {
  id: string;
  patientId: string;
  originCity: string;
  destinationHospital: string;
  roundTripDistanceKm: number;
  estimatedTravelHours: number;
  estimatedCostInr: number;
  recommendedOption: string;
  recommendationRationale: string;
  isEscalated: boolean;
  createdAt: string;
}

export interface FollowUpPlan {
  id: string;
  patientId: string;
  riskAssessmentId?: string;
  travelComparisonId?: string;
  title: string;
  clinicalSummary: string;
  status: FollowUpPlanStatus;
  approvedByClinician?: string;
  approvedAt?: string;
  startDate: string;
  targetCompletionDate?: string;
  createdAt: string;
  updatedAt: string;
  appointments?: Appointment[];
}

export interface Appointment {
  id: string;
  planId: string;
  patientId: string;
  providerId?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledStartTime: string;
  scheduledEndTime: string;
  locationOrService: string;
  clinicalNotes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  teleSession?: TeleconsultationSession;
  outcomeRecord?: ConsultationRecord;
}

export interface TeleconsultationSession {
  id: string;
  planId: string;
  appointmentId: string;
  roomName: string;
  domain: string;
  status: TeleSessionStatus;
  jwtToken?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationRecord {
  id: string;
  appointmentId: string;
  teleSessionId?: string;
  clinicianId: string;
  subjectiveNotes: string;
  objectiveFindings?: string;
  assessmentPlan: string;
  followUpRequired: boolean;
  nextFollowUpDate?: string;
  completedAt: string;
}

export interface PaymentOrder {
  id: string;
  userId?: string;
  planId: string;
  appointmentId?: string;
  serviceType?: string;
  amount: number; // In paise (e.g. 50000 = 500 INR)
  currency: 'INR';
  receipt: string;
  status: PaymentStatus;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  signatureVerified: boolean;
  verifiedAt?: string;
  webhookEventId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  deliveryStatus: 'SIMULATED' | 'SENT' | 'FAILED';
  linkUrl?: string;
  createdAt: string;
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const CreatePlanSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  clinicalSummary: z.string().min(5, 'Clinical summary is required'),
  riskAssessmentId: z.string().optional(),
  travelComparisonId: z.string().optional(),
  startDate: z.string().datetime({ message: 'Valid ISO date string required for start date' }),
  targetCompletionDate: z.string().datetime().optional(),
  approvedByClinician: z.string().optional(),
});

export const CreateAppointmentSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  patientId: z.string().min(1, 'Patient ID is required'),
  providerId: z.string().optional(),
  type: z.enum(['TELECONSULTATION', 'LOCAL_CLINIC_VISIT', 'HOSPITAL_RETURN', 'DIAGNOSTIC_LAB']),
  scheduledStartTime: z.string().datetime({ message: 'Valid ISO date required for start time' }),
  scheduledEndTime: z.string().datetime({ message: 'Valid ISO date required for end time' }),
  locationOrService: z.string().min(2, 'Location or service description required'),
  clinicalNotes: z.string().optional(),
});

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum([
    'PROPOSED',
    'SCHEDULED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'RESCHEDULED',
    'CANCELLED',
    'NO_SHOW',
  ]),
  cancellationReason: z.string().optional(),
  newStartTime: z.string().datetime().optional(),
  newEndTime: z.string().datetime().optional(),
});

export const CreateTeleSessionSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
});

export const CreateConsultationRecordSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  teleSessionId: z.string().optional(),
  clinicianId: z.string().min(1, 'Clinician identifier is required'),
  subjectiveNotes: z.string().min(5, 'Subjective clinical notes required'),
  objectiveFindings: z.string().optional(),
  assessmentPlan: z.string().min(5, 'Assessment plan is required'),
  followUpRequired: z.boolean().default(false),
  nextFollowUpDate: z.string().datetime().optional(),
});

export const SERVICE_PRICING_INR: Record<string, { paise: number; rupees: number; description: string }> = {
  TELECONSULTATION: { paise: 50000, rupees: 500, description: 'Post-Surgical Teleconsultation Session' },
  LOCAL_CLINIC_VISIT: { paise: 40000, rupees: 400, description: 'Local Clinic In-Person Evaluation' },
  HOSPITAL_RETURN: { paise: 100000, rupees: 1000, description: 'Hospital Surgical Review Visit' },
  DIAGNOSTIC_LAB: { paise: 65000, rupees: 650, description: 'Post-Op Lab Work & Diagnostics' },
  POST_OP_WOUND_CARE: { paise: 35000, rupees: 350, description: 'Surgical Wound Dressing & Assessment' },
  SUTURE_REMOVAL: { paise: 30000, rupees: 300, description: 'Suture & Staple Removal Service' },
};

export const CreatePaymentOrderSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  appointmentId: z.string().optional(),
  serviceType: z.enum([
    'TELECONSULTATION',
    'LOCAL_CLINIC_VISIT',
    'HOSPITAL_RETURN',
    'DIAGNOSTIC_LAB',
    'POST_OP_WOUND_CARE',
    'SUTURE_REMOVAL',
  ]).optional(),
  amount: z.number().int().positive('Amount must be positive integer paise').optional(),
  currency: z.string().refine((val) => val === 'INR', {
    message: 'Only INR currency is supported.',
  }).default('INR'),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Signature is required'),
});
