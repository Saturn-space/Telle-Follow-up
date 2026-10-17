// Tele-Follow-Up Orchestrator - Member 2 Risk Data Store
// Provides thread-safe repository access for risk assessments, clinician reviews, and synthetic patient records.

import {
  PatientRecoveryInput,
  RiskAssessmentResult,
  ClinicianReviewSubmission,
  ClinicianReviewRecord,
} from './types';
import { evaluatePatientRisk } from './evaluator';
import { randomUUID } from 'crypto';

// Seeded synthetic post-op patient profiles (Member 1 integration fixtures)
export const SEEDED_PATIENT_CASES: Record<string, PatientRecoveryInput> = {
  'pat_chole_01': {
    patientId: 'pat_chole_01',
    patientName: 'Ramesh Sharma (Synthetic)',
    patientAge: 48,
    patientGender: 'Male',
    originalHospital: 'Apollo Speciality Hospitals, Chennai',
    primaryState: 'Odisha',
    procedureName: 'Laparoscopic Cholecystectomy',
    surgeryDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    dischargeDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    postOpDay: 3,
    recoveryLogId: 'rec_chole_01',
    logTimestamp: new Date().toISOString(),
    vitals: {
      temperatureC: 36.8,
      heartRate: 72,
      systolicBP: 122,
      diastolicBP: 78,
      respiratoryRate: 16,
      oxygenSat: 98,
    },
    painScore: 2,
    mobilityLevel: 'Independent ambulation',
    symptoms: ['Mild port-site soreness'],
    woundDescription: 'Three port incisions clean, dry, dressings intact, no periwound redness.',
    drainOutputMl: null,
    isDocumentVerified: true,
  },
  'pat_tka_02': {
    patientId: 'pat_tka_02',
    patientName: 'Sunita Patel (Synthetic)',
    patientAge: 64,
    patientGender: 'Female',
    originalHospital: 'Max Super Speciality Hospital, New Delhi',
    primaryState: 'Rajasthan',
    procedureName: 'Total Knee Arthroplasty (Right)',
    surgeryDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    dischargeDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    postOpDay: 7,
    recoveryLogId: 'rec_tka_02',
    logTimestamp: new Date().toISOString(),
    vitals: {
      temperatureC: 38.1, // Low-grade fever
      heartRate: 98,
      systolicBP: null, // Missing BP
      diastolicBP: null,
      respiratoryRate: 18,
      oxygenSat: 96,
    },
    painScore: 6,
    mobilityLevel: 'Ambulating with walker assistance',
    symptoms: ['Mild knee swelling', 'Warmth over patella', 'Low grade chills'],
    woundDescription: 'Surgical staple line intact, marginal periwound erythema noted 1cm around joint line, no purulent drainage.',
    drainOutputMl: null,
    isDocumentVerified: true,
  },
  'pat_cabg_03': {
    patientId: 'pat_cabg_03',
    patientName: 'Vikram Sengupta (Synthetic)',
    patientAge: 59,
    patientGender: 'Male',
    originalHospital: 'Fortis Escorts Heart Institute, New Delhi',
    primaryState: 'Assam',
    procedureName: 'Coronary Artery Bypass Graft (CABG x3)',
    surgeryDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    dischargeDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    postOpDay: 5,
    recoveryLogId: 'rec_cabg_03',
    logTimestamp: new Date().toISOString(),
    vitals: {
      temperatureC: 37.4,
      heartRate: 124, // Severe resting tachycardia
      systolicBP: 94, // Hypotension -> Shock Index = 1.32!
      diastolicBP: 60,
      respiratoryRate: 26,
      oxygenSat: 88, // Severe hypoxemia
    },
    painScore: 7,
    mobilityLevel: 'Bedrest, orthopneic',
    symptoms: ['Severe shortness of breath', 'Chest pain', 'Cold clammy extremities'],
    woundDescription: 'Median sternotomy intact, saphenous vein harvest site dry.',
    drainOutputMl: null,
    isDocumentVerified: true,
  },
};

// Global in-memory storage holding assessments across request cycles
class RiskStore {
  private assessments: Map<string, RiskAssessmentResult> = new Map();

  constructor() {
    this.seedInitialAssessments();
  }

  private async seedInitialAssessments() {
    // Generate initial assessments for the 3 synthetic cases so the UI is immediately populated
    try {
      for (const key of Object.keys(SEEDED_PATIENT_CASES)) {
        const input = SEEDED_PATIENT_CASES[key];
        const result = await evaluatePatientRisk(input, { enableAiExplanation: false });
        // Assign a friendly ID for the seeded record
        result.assessmentId = `risk_${input.patientId}_init`;
        this.assessments.set(result.assessmentId, result);
      }
    } catch (e) {
      console.warn('Initial seeding note:', e);
    }
  }

  public async createAssessment(
    input: PatientRecoveryInput,
    options?: { enableAiExplanation?: boolean }
  ): Promise<RiskAssessmentResult> {
    const assessment = await evaluatePatientRisk(input, options);
    this.assessments.set(assessment.assessmentId, assessment);
    return assessment;
  }

  public getAssessmentById(id: string): RiskAssessmentResult | null {
    return this.assessments.get(id) || null;
  }

  public listAssessmentsForPatient(patientId: string): RiskAssessmentResult[] {
    const results: RiskAssessmentResult[] = [];
    for (const item of this.assessments.values()) {
      if (item.patientId === patientId) {
        results.push(item);
      }
    }
    // Sort descending by timestamp
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public listAllAssessments(): RiskAssessmentResult[] {
    return Array.from(this.assessments.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public applyClinicianReview(
    assessmentId: string,
    submission: ClinicianReviewSubmission
  ): RiskAssessmentResult {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment with ID "${assessmentId}" not found.`);
    }

    const reviewId = `rev_${randomUUID().substring(0, 8)}`;
    const nowIso = new Date().toISOString();

    const reviewRecord: ClinicianReviewRecord = {
      reviewId,
      assessmentId,
      reviewerId: submission.reviewerId,
      reviewerName: submission.reviewerName,
      reviewerRole: submission.reviewerRole,
      decision: submission.decision,
      originalLevel: assessment.riskLevel,
      finalLevel: submission.overrideLevel || assessment.riskLevel,
      clinicalNotes: submission.clinicalNotes,
      escalationRaised: !!submission.escalateToOperatingSurgeon,
      reviewedAt: nowIso,
    };

    // Update assessment in place while preserving original provenance
    assessment.reviewStatus = submission.decision;
    assessment.latestReview = reviewRecord;
    assessment.updatedAt = nowIso;

    if (submission.overrideLevel) {
      assessment.riskLevel = submission.overrideLevel;
    }

    if (submission.escalateToOperatingSurgeon) {
      assessment.isEscalated = true;
      assessment.escalationReason = `Clinician Escalation by Dr. ${submission.reviewerName}: ${submission.clinicalNotes}`;
    }

    this.assessments.set(assessmentId, assessment);
    return assessment;
  }
}

// Global singleton instance
const globalRiskStoreKey = Symbol.for('tele_followup.risk_store');
const globalAny = global as unknown as { [key: symbol]: RiskStore };

if (!globalAny[globalRiskStoreKey]) {
  globalAny[globalRiskStoreKey] = new RiskStore();
}

export const riskStore = globalAny[globalRiskStoreKey];
