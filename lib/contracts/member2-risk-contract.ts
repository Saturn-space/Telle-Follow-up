// lib/contracts/member2-risk-contract.ts
// Integration Contract between Member 1 (Patient/Recovery) and Member 2 (AI Risk Prediction)
//
// CONTRACT RULES:
// 1. Member 1 provides raw, structured clinical observations, surgical context, and vital signs with units.
// 2. Member 1 NEVER calculates risk scores, assigns risk tiers, or determines if recovery is "clinically normal".
// 3. Member 2 consumes this interface to evaluate risk, detect anomalies, and generate clinical decision-support output.
// 4. Missing values are explicitly represented as null or undefined, never fabricated.

export interface RecoveryObservationDataContract {
  patientId: string;
  mrn: string;
  demographics: {
    ageYears: number;
    gender: string;
  };
  surgeryContext: {
    surgeryId: string;
    procedureName: string;
    surgicalSpecialty: string;
    surgeryDate: string; // ISO
    dischargeDate: string; // ISO
    daysPostOp: number;
    dischargeCondition: string;
  } | null;
  observation: {
    observationId: string;
    recordedAt: string; // ISO
    reportedByRole: 'PATIENT' | 'CLINICIAN' | 'COORDINATOR' | 'ADMIN';
    painScore: {
      value: number | null; // 0 to 10 scale or null if unrecorded
      scale: 'NRS_0_TO_10';
    } | null;
    mobilityStatus: string;
    woundCondition: string;
    symptoms: string[];
    patientNotes?: string | null;
    vitals: {
      temperature?: {
        value: number;
        unit: 'celsius';
      } | null;
      heartRate?: {
        value: number;
        unit: 'bpm';
      } | null;
      bloodPressure?: {
        systolic: number;
        diastolic: number;
        unit: 'mmHg';
      } | null;
      spO2?: {
        value: number;
        unit: 'percent';
      } | null;
      drainOutput?: {
        value: number;
        unit: 'ml';
      } | null;
    };
  } | null;
  historicalObservationsCount: number;
  unverifiedDocumentCount: number;
  dataQuality: {
    observationFreshnessStatus: 'CURRENT' | 'STALE' | 'NONE';
    isStale: boolean; // Flagged true if latest observation > 48 hours old or nonexistent
    hoursSinceLastObservation: number | null;
    missingVitalFields: string[];
    dataQualityWarnings: string[];
  };
}
