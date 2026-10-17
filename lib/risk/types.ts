// Tele-Follow-Up Orchestrator - Member 2 Risk Domain Types
// Strictly defines data structures for risk evaluation, clinical decision support, and auditability.

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'INDETERMINATE';

export type ReviewStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'OVERRIDDEN' | 'REJECTED';

export type AssessmentEngine = 'DETERMINISTIC_RULES_V1' | 'CLAUDE_CDS_HYBRID_V1' | 'FALLBACK_HEURISTIC';

export type FactorImpact = 'NORMAL_BASELINE' | 'MODERATE_ELEVATION' | 'HIGH_RISK_FACTOR' | 'CRITICAL_TRIGGER';

export interface VitalObservations {
  systolicBP?: number | null;
  diastolicBP?: number | null;
  heartRate?: number | null;
  temperatureC?: number | null;
  respiratoryRate?: number | null;
  oxygenSat?: number | null;
  observedAt?: string; // ISO 8601
}

export interface PatientRecoveryInput {
  patientId: string;
  patientName?: string; // Synthetic/de-identified
  patientAge?: number;
  patientGender?: string;
  originalHospital?: string;
  primaryState?: string;
  
  // Surgical Context
  surgeryId?: string;
  procedureName: string;
  surgeryDate: string; // ISO 8601
  dischargeDate: string; // ISO 8601
  postOpDay: number;
  
  // Recovery Observations
  recoveryLogId: string;
  logTimestamp: string;
  vitals: VitalObservations;
  painScore: number; // 0-10
  mobilityLevel?: string;
  symptoms: string[];
  woundDescription?: string | null;
  drainOutputMl?: number | null;
  
  // OCR Document context from Member 1
  extractedDocumentText?: string | null;
  isDocumentVerified?: boolean;
}

export interface SupportingFactor {
  factorId: string;
  category: 'VITALS' | 'WOUND' | 'PAIN' | 'MOBILITY' | 'SYSTEMIC';
  factorTitle: string;
  description: string;
  impact: FactorImpact;
  sourceFieldRef: string;
  observedValue?: string;
  referenceRange?: string;
}

export interface DataQualityAlert {
  alertId: string;
  type: 'RED_FLAG' | 'MISSING_DATA' | 'STALE_DATA' | 'SUSPICIOUS_VALUE' | 'AI_OUTAGE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  headline: string;
  detailedMessage: string;
  affectedFields: string[];
}

export interface AiExplanationPayload {
  aiStatus: 'SUCCESS' | 'UNCONFIGURED' | 'FAILED' | 'SKIPPED';
  modelName?: string;
  responseTimeMs?: number;
  summaryText?: string;
  clinicalQuestionsForClinician?: string[];
  recommendedFocusAreas?: string[];
  disclaimers?: string[];
  rawError?: string;
}

export interface ClinicianReviewRecord {
  reviewId: string;
  assessmentId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'SURGEON' | 'LOCAL_DOCTOR' | 'COORDINATOR';
  decision: ReviewStatus;
  originalLevel: RiskLevel;
  finalLevel: RiskLevel;
  clinicalNotes: string;
  escalationRaised: boolean;
  reviewedAt: string; // ISO 8601
}

export interface RiskAssessmentResult {
  assessmentId: string;
  patientId: string;
  recoveryLogId: string;
  timestamp: string; // ISO 8601
  engine: AssessmentEngine;
  engineVersion: string;
  inputDataHash: string; // SHA256 of normalized inputs
  
  // Risk Stratification
  riskLevel: RiskLevel;
  heuristicScore: number; // 0-100 advisory triage score (NOT an epidemiological probability)
  requiresInPerson: boolean;
  
  // Explanatory breakdown
  clinicalSummary: string;
  contributingFactors: SupportingFactor[];
  dataQualityAlerts: DataQualityAlert[];
  missingDataFlags: string[];
  limitations: string[];
  
  // Emergency Escalation
  isEscalated: boolean;
  escalationReason: string | null;
  
  // AI CDS Enrichment
  aiSynthesis: AiExplanationPayload;
  
  // Human Review State
  reviewStatus: ReviewStatus;
  latestReview?: ClinicianReviewRecord | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface ClinicianReviewSubmission {
  decision: ReviewStatus;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'SURGEON' | 'LOCAL_DOCTOR' | 'COORDINATOR';
  overrideLevel?: RiskLevel;
  clinicalNotes: string;
  escalateToOperatingSurgeon?: boolean;
}
