// Tele-Follow-Up Orchestrator - Member 2 Risk Evaluator Engine
// Coordinates validation, rule-based clinical scoring, AI clinical synthesis, and audit provenance.

import { createHash, randomUUID } from 'crypto';
import {
  PatientRecoveryInput,
  RiskAssessmentResult,
} from './types';
import { evaluateDeterministicRules } from './rules';
import { generateClaudeClinicalExplanation } from './claude';

export interface EvaluationOptions {
  enableAiExplanation?: boolean;
}

export function validateRecoveryInput(input: PatientRecoveryInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.patientId) errors.push('patientId is required.');
  if (!input.procedureName) errors.push('procedureName is required.');
  if (input.postOpDay == null || input.postOpDay < 0) errors.push('postOpDay must be a non-negative integer.');
  if (input.painScore == null || input.painScore < 0 || input.painScore > 10) {
    errors.push('painScore must be between 0 and 10.');
  }

  // Vital sign realistic physiological boundaries
  const { vitals } = input;
  if (vitals.temperatureC != null && (vitals.temperatureC < 30 || vitals.temperatureC > 45)) {
    errors.push(`temperatureC (${vitals.temperatureC}) is outside realistic physiological bounds (30-45°C).`);
  }
  if (vitals.heartRate != null && (vitals.heartRate < 25 || vitals.heartRate > 250)) {
    errors.push(`heartRate (${vitals.heartRate}) is outside realistic physiological bounds (25-250 bpm).`);
  }
  if (vitals.systolicBP != null && (vitals.systolicBP < 40 || vitals.systolicBP > 280)) {
    errors.push(`systolicBP (${vitals.systolicBP}) is outside realistic bounds (40-280 mmHg).`);
  }
  if (vitals.oxygenSat != null && (vitals.oxygenSat < 40 || vitals.oxygenSat > 100)) {
    errors.push(`oxygenSat (${vitals.oxygenSat}) must be between 40% and 100%.`);
  }
  if (vitals.respiratoryRate != null && (vitals.respiratoryRate < 4 || vitals.respiratoryRate > 80)) {
    errors.push(`respiratoryRate (${vitals.respiratoryRate}) is outside realistic bounds (4-80 breaths/min).`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function evaluatePatientRisk(
  input: PatientRecoveryInput,
  options: EvaluationOptions = {}
): Promise<RiskAssessmentResult> {
  // 1. Validate Input
  const validation = validateRecoveryInput(input);
  if (!validation.isValid) {
    throw new Error(`Input validation failed: ${validation.errors.join(' ')}`);
  }

  // 2. Compute Input Snapshot Hash for Immutable Audit Provenance
  const canonicalString = JSON.stringify({
    patientId: input.patientId,
    procedureName: input.procedureName,
    postOpDay: input.postOpDay,
    vitals: input.vitals,
    painScore: input.painScore,
    symptoms: [...input.symptoms].sort(),
    woundDescription: input.woundDescription,
    drainOutputMl: input.drainOutputMl,
  });
  const inputDataHash = createHash('sha256').update(canonicalString).digest('hex');

  // 3. Deterministic Physiological Safety & Red Flag Evaluation
  const ruleResult = evaluateDeterministicRules(input);

  // 4. AI-Assisted Clinical Decision Support (Claude)
  const shouldRunAi = options.enableAiExplanation !== false;
  let aiSynthesis;
  if (shouldRunAi) {
    aiSynthesis = await generateClaudeClinicalExplanation(
      input,
      ruleResult.riskLevel,
      ruleResult.heuristicScore
    );
  } else {
    aiSynthesis = {
      aiStatus: 'SKIPPED' as const,
      modelName: 'None',
      responseTimeMs: 0,
      summaryText: 'AI clinical explanation was skipped by evaluation options.',
      clinicalQuestionsForClinician: [],
      recommendedFocusAreas: [],
      disclaimers: ['Assessment generated strictly from deterministic rule engine.'],
    };
  }

  const nowIso = new Date().toISOString();
  const assessmentId = `risk_${randomUUID().substring(0, 8)}`;

  // 5. Construct Final Auditable Assessment Record
  const result: RiskAssessmentResult = {
    assessmentId,
    patientId: input.patientId,
    recoveryLogId: input.recoveryLogId || `rec_${randomUUID().substring(0, 8)}`,
    timestamp: nowIso,
    engine: shouldRunAi ? 'CLAUDE_CDS_HYBRID_V1' : 'DETERMINISTIC_RULES_V1',
    engineVersion: '1.0.0',
    inputDataHash,
    riskLevel: ruleResult.riskLevel,
    heuristicScore: ruleResult.heuristicScore,
    requiresInPerson: ruleResult.requiresInPerson,
    clinicalSummary: ruleResult.clinicalSummary,
    contributingFactors: ruleResult.contributingFactors,
    dataQualityAlerts: ruleResult.dataQualityAlerts,
    missingDataFlags: ruleResult.missingDataFlags,
    limitations: ruleResult.limitations,
    isEscalated: ruleResult.isEscalated,
    escalationReason: ruleResult.escalationReason,
    aiSynthesis,
    reviewStatus: 'PENDING_REVIEW',
    latestReview: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return result;
}
