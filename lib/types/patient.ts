// lib/types/patient.ts
// Shared Type Definitions for Member 1: Patient Registration & Recovery Monitoring

export type UserRole = 'PATIENT' | 'CLINICIAN' | 'COORDINATOR' | 'ADMIN';

export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEWED';

export type DocumentCategory =
  | 'DISCHARGE_SUMMARY'
  | 'LAB_REPORT'
  | 'WOUND_PHOTO'
  | 'PRESCRIPTION'
  | 'OTHER';

export interface Patient {
  id: string;
  userId?: string | null;
  mrn: string; // Medical Record Number
  fullName: string;
  dateOfBirth: string; // ISO date string
  gender: string;
  phone: string;
  homeAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  emergencyContact?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Surgery {
  id: string;
  patientId: string;
  procedureName: string;
  surgicalSpecialty: string;
  hospitalName: string;
  hospitalCity: string;
  hospitalState: string;
  operatingSurgeon: string;
  surgeryDate: string; // ISO date
  dischargeDate: string; // ISO date
  dischargeCondition: string;
  woundCareInstructions?: string | null;
  plannedFollowUpDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalMeasurement {
  id: string;
  patientId: string;
  recoveryEntryId?: string | null;
  recordedAt: string; // ISO date
  temperatureC?: number | null; // e.g., 37.2
  heartRateBpm?: number | null; // e.g., 74
  systolicBp?: number | null; // e.g., 120
  diastolicBp?: number | null; // e.g., 80
  spO2Percent?: number | null; // e.g., 98
  drainOutputMl?: number | null; // e.g., 15
  createdAt: string;
}

export interface RecoveryEntry {
  id: string;
  patientId: string;
  recordedAt: string;
  painScore: number; // 0 to 10
  mobilityStatus: string; // 'Independent' | 'Assisted' | 'Bedbound'
  woundCondition: string; // 'Clean/Dry' | 'Redness' | 'Drainage' | 'Heat' | 'Swelling' | 'Dehiscence'
  symptoms: string[];
  patientNotes?: string | null;
  reportedByRole: UserRole;
  createdAt: string;
  vitals?: VitalMeasurement[];
}

export interface MedicalDocument {
  id: string;
  patientId: string;
  category: DocumentCategory;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
  ocrExtraction?: OcrExtraction | null;
}

export interface OcrExtraction {
  id: string;
  documentId: string;
  status: OcrStatus;
  rawExtractedText?: string | null;
  extractedMetadata?: Record<string, unknown> | null;
  isVerified: boolean;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  correctionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineItem {
  id: string;
  type: 'SURGERY' | 'DISCHARGE' | 'RECOVERY_LOG' | 'VITALS' | 'DOCUMENT' | 'OCR_VERIFIED';
  title: string;
  timestamp: string;
  description?: string;
  details: Record<string, unknown>;
  badgeVariant?: 'default' | 'success' | 'warning' | 'info';
}
