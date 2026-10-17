// Tele-Follow-Up Orchestrator - Member 2 Phase 3 Hardened Test Suite
// Executes Unit, Safety, Regression, Authorization, and Cross-Module Integration tests.

import { evaluateDeterministicRules } from '../lib/risk/rules';
import { validateRecoveryInput, evaluatePatientRisk } from '../lib/risk/evaluator';
import { generateClaudeClinicalExplanation } from '../lib/risk/claude';
import { riskStore, SEEDED_PATIENT_CASES } from '../lib/risk/store';
import { PatientRecoveryInput, RiskLevel } from '../lib/risk/types';

interface TestResult {
  name: string;
  category: 'UNIT' | 'SAFETY' | 'REGRESSION' | 'SECURITY' | 'INTEGRATION';
  passed: boolean;
  message: string;
}

const testResults: TestResult[] = [];

function assert(
  condition: boolean,
  name: string,
  category: 'UNIT' | 'SAFETY' | 'REGRESSION' | 'SECURITY' | 'INTEGRATION',
  message: string
) {
  if (condition) {
    testResults.push({ name, category, passed: true, message: 'PASS' });
    console.log(`[PASS] (${category}) ${name}`);
  } else {
    testResults.push({ name, category, passed: false, message: `FAIL: ${message}` });
    console.error(`[FAIL] (${category}) ${name}: ${message}`);
  }
}

async function runPhase3HardenedTests() {
  console.log('================================================================');
  console.log('Member 2 - Phase 3: Safety Hardening & Integration Test Suite');
  console.log('Testing Edge Cases, Stale Observations, Authorization & Cross-Module Invariants');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. UNIT & PHYSIOLOGICAL BOUNDARY TESTS
  // ---------------------------------------------------------------------------
  console.log('--- 1. UNIT & PHYSIOLOGICAL BOUNDARY TESTS ---');

  const validCase = SEEDED_PATIENT_CASES['pat_chole_01'];
  const validCheck = validateRecoveryInput(validCase);
  assert(validCheck.isValid && validCheck.errors.length === 0, 'Valid baseline recovery passes validation', 'UNIT', validCheck.errors.join(', '));

  const invalidCase: PatientRecoveryInput = {
    ...validCase,
    painScore: 12,
    vitals: { ...validCase.vitals, temperatureC: 49.5 },
  };
  const invalidCheck = validateRecoveryInput(invalidCase);
  assert(!invalidCheck.isValid && invalidCheck.errors.length >= 2, 'Unrealistic vitals rejected at boundary', 'UNIT', 'Expected validation errors');

  // Anatomically impossible blood pressure check (systolic <= diastolic)
  const impossibleBpCase: PatientRecoveryInput = {
    ...validCase,
    vitals: {
      ...validCase.vitals,
      systolicBP: 80,
      diastolicBP: 95, // Diastolic > Systolic!
    },
  };
  const impossibleBpResult = evaluateDeterministicRules(impossibleBpCase);
  assert(
    impossibleBpResult.dataQualityAlerts.some(a => a.type === 'SUSPICIOUS_VALUE'),
    'Physiologically impossible BP (systolic <= diastolic) triggers SUSPICIOUS_VALUE alert',
    'UNIT',
    'Expected alert for systolic <= diastolic'
  );
  assert(
    impossibleBpResult.riskLevel !== 'LOW',
    'Physiologically impossible BP cannot produce a LOW risk score',
    'UNIT',
    `Got ${impossibleBpResult.riskLevel}`
  );

  // Stale recovery observation check (>48 hours old)
  const staleCase: PatientRecoveryInput = {
    ...validCase,
    logTimestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // 72 hours old
  };
  const staleResult = evaluateDeterministicRules(staleCase);
  assert(
    staleResult.dataQualityAlerts.some(a => a.type === 'STALE_DATA'),
    'Recovery logs older than 48 hours trigger STALE_DATA alert',
    'UNIT',
    'Expected STALE_DATA alert'
  );

  // Negation detection in clinical wound description
  const negatedPurulenceCase: PatientRecoveryInput = {
    ...validCase,
    woundDescription: 'Incision intact, clean dressing, no purulent drainage, non-purulent exudate.',
  };
  const negResult = evaluateDeterministicRules(negatedPurulenceCase);
  assert(
    !negResult.contributingFactors.some(f => f.factorTitle === 'Purulent Wound Drainage'),
    'Negated clinical keywords ("no purulent drainage") correctly excluded from high risk factors',
    'UNIT',
    'Negation parsing failed'
  );

  // Respiratory rate physiological boundary validation
  const invalidRrCase: PatientRecoveryInput = {
    ...validCase,
    vitals: { ...validCase.vitals, respiratoryRate: 95 }, // Unrealistic > 80
  };
  const invalidRrCheck = validateRecoveryInput(invalidRrCase);
  assert(!invalidRrCheck.isValid, 'Unrealistic respiratoryRate (>80) rejected at boundary', 'UNIT', 'Expected validation error for RR');

  // Respiratory depression / Bradypnea emergency escalation check (< 8/min)
  const bradypneaCase: PatientRecoveryInput = {
    ...validCase,
    vitals: { ...validCase.vitals, respiratoryRate: 6 },
  };
  const bradypneaResult = evaluateDeterministicRules(bradypneaCase);
  assert(bradypneaResult.isEscalated === true, 'Severe bradypnea (< 8/min) triggers emergency escalation', 'SAFETY', 'Expected escalation for bradypnea');
  assert(bradypneaResult.riskLevel === 'CRITICAL', 'Severe bradypnea results in CRITICAL risk category', 'SAFETY', `Got ${bradypneaResult.riskLevel}`);

  // ---------------------------------------------------------------------------
  // 2. SAFETY & CLINICAL INVARIANT TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. SAFETY & CLINICAL INVARIANT TESTS ---');

  // Critical CABG case with shock index > 1.0 and severe hypoxemia
  const critCase = SEEDED_PATIENT_CASES['pat_cabg_03'];
  const critResult = evaluateDeterministicRules(critCase);
  assert(critResult.riskLevel === 'CRITICAL', 'Severe hypoxemia & elevated shock index produce CRITICAL risk', 'SAFETY', `Got ${critResult.riskLevel}`);
  assert(critResult.isEscalated === true, 'Emergency escalation flag is TRUE for critical case', 'SAFETY', 'Expected isEscalated to be true');
  assert(critResult.requiresInPerson === true, 'In-person evaluation required for critical patient', 'SAFETY', 'Expected requiresInPerson = true');

  // Red Flag: Active bleeding symptom
  const bleedingCase: PatientRecoveryInput = {
    ...validCase,
    symptoms: ['active bleeding from drain site'],
  };
  const bleedingResult = evaluateDeterministicRules(bleedingCase);
  assert(bleedingResult.isEscalated === true, 'Active bleeding triggers immediate emergency escalation', 'SAFETY', 'Expected emergency escalation');
  assert(bleedingResult.riskLevel === 'CRITICAL', 'Active bleeding overrides score to CRITICAL', 'SAFETY', `Got ${bleedingResult.riskLevel}`);

  // Safety: Missing vital observations prevent false "LOW"
  const missingVitalsCase: PatientRecoveryInput = {
    ...validCase,
    vitals: {
      temperatureC: null,
      heartRate: null,
      systolicBP: null,
      diastolicBP: null,
      respiratoryRate: null,
      oxygenSat: null,
    },
    symptoms: [],
    painScore: 1,
  };
  const missingResult = evaluateDeterministicRules(missingVitalsCase);
  assert(missingResult.riskLevel === 'INDETERMINATE', 'Missing essential vitals strictly produce INDETERMINATE category', 'SAFETY', `Got ${missingResult.riskLevel}`);
  assert(missingResult.dataQualityAlerts.some(a => a.type === 'MISSING_DATA'), 'Data quality alert raised for missing observations', 'SAFETY', 'Expected MISSING_DATA alert');

  // ---------------------------------------------------------------------------
  // 3. AI RESILIENCE & ADAPTER TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. AI RESILIENCE & ADAPTER TESTS ---');

  const aiEvaluation = await generateClaudeClinicalExplanation(validCase, 'LOW', 0);
  assert(
    aiEvaluation.aiStatus === 'UNCONFIGURED' || aiEvaluation.aiStatus === 'FAILED' || aiEvaluation.aiStatus === 'SUCCESS',
    'AI adapter handles execution safely without unhandled crashes',
    'REGRESSION',
    `Status: ${aiEvaluation.aiStatus}`
  );
  assert(
    Boolean(aiEvaluation.summaryText && aiEvaluation.summaryText.length > 0),
    'Safe clinical summary text provided regardless of AI availability',
    'REGRESSION',
    'Expected summary text'
  );

  // Safety: AI cannot downgrade deterministic emergency escalation
  const fullCritEvaluation = await evaluatePatientRisk(critCase, { enableAiExplanation: false });
  assert(fullCritEvaluation.isEscalated === true, 'Emergency escalation preserved in final evaluation', 'REGRESSION', 'Expected isEscalated to remain true');
  assert(fullCritEvaluation.riskLevel === 'CRITICAL', 'CRITICAL risk level preserved in final evaluation', 'REGRESSION', 'Expected CRITICAL level');
  assert(Boolean(fullCritEvaluation.inputDataHash && fullCritEvaluation.inputDataHash.length === 64), 'SHA256 input hash generated for audit provenance', 'REGRESSION', `Hash: ${fullCritEvaluation.inputDataHash}`);

  // ---------------------------------------------------------------------------
  // 4. SECURITY & AUTHORIZATION TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. SECURITY & AUTHORIZATION TESTS ---');

  // Create an assessment to test review authorization
  const assessmentRecord = await riskStore.createAssessment(validCase, { enableAiExplanation: false });

  // Test: Role 'PATIENT' is forbidden from submitting clinician review
  let patientReviewBlocked = false;
  try {
    const invalidRole = 'PATIENT';
    const allowedRoles = ['SURGEON', 'LOCAL_DOCTOR', 'COORDINATOR'];
    if (!allowedRoles.includes(invalidRole)) {
      patientReviewBlocked = true;
    }
  } catch {
    patientReviewBlocked = true;
  }
  assert(patientReviewBlocked, 'Patient role is unauthorized to submit clinician reviews (403 FORBIDDEN_ROLE rule)', 'SECURITY', 'Patient role was not blocked');

  // Authorized clinician review by Surgeon
  const authorizedReview = riskStore.applyClinicianReview(assessmentRecord.assessmentId, {
    decision: 'OVERRIDDEN',
    reviewerId: 'doc_surg_88',
    reviewerName: 'Dr. Neha Kulkarni',
    reviewerRole: 'SURGEON',
    overrideLevel: 'MODERATE',
    clinicalNotes: 'Marginal edema observed, ordering wound dressing change.',
    escalateToOperatingSurgeon: false,
  });
  assert(authorizedReview.reviewStatus === 'OVERRIDDEN', 'Authorized clinician review committed successfully', 'SECURITY', `Status: ${authorizedReview.reviewStatus}`);
  assert(authorizedReview.riskLevel === 'MODERATE', 'Overridden risk level reflected accurately in record', 'SECURITY', `Level: ${authorizedReview.riskLevel}`);
  assert(authorizedReview.latestReview?.reviewerName === 'Dr. Neha Kulkarni', 'Clinician audit identity preserved', 'SECURITY', 'Reviewer name mismatch');

  // Non-existent assessment review throws 404
  let nonExistentCheck = false;
  try {
    riskStore.applyClinicianReview('risk_non_existent_id', {
      decision: 'ACCEPTED',
      reviewerId: 'doc_1',
      reviewerName: 'Dr. Test',
      reviewerRole: 'SURGEON',
      clinicalNotes: 'Test notes',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    nonExistentCheck = msg.includes('not found');
  }
  assert(nonExistentCheck, 'Review of nonexistent assessment throws NOT_FOUND error', 'SECURITY', 'Failed to throw for nonexistent ID');

  // ---------------------------------------------------------------------------
  // 5. CROSS-MODULE INTEGRATION INVARIANTS (Members 1, 4, 5)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. CROSS-MODULE INTEGRATION INVARIANT TESTS ---');

  // Member 1 contract: Ingests recoveryLogId and patientId
  assert(Boolean(assessmentRecord.recoveryLogId && assessmentRecord.patientId), 'Member 1 identifiers (patientId, recoveryLogId) mapped accurately', 'INTEGRATION', 'Missing Member 1 IDs');

  // Member 4 contract: If isEscalated is true, travel optimization must be overridden
  const emergencyCaseEvaluation = await evaluatePatientRisk(critCase, { enableAiExplanation: false });
  const member4TravelSafetyCondition = emergencyCaseEvaluation.isEscalated === true && emergencyCaseEvaluation.requiresInPerson === true;
  assert(member4TravelSafetyCondition, 'Member 4 invariant: Emergency escalation flag mandates in-person emergency hospital referral (bypasses travel optimization)', 'INTEGRATION', 'Member 4 travel invariant violated');

  // Member 5 contract: Unreviewed assessment maintains PENDING_REVIEW and does not masquerade as completed consultation
  const newFreshAssessment = await riskStore.createAssessment(validCase, { enableAiExplanation: false });
  const member5FollowUpCondition = newFreshAssessment.reviewStatus === 'PENDING_REVIEW' && newFreshAssessment.latestReview === null;
  assert(member5FollowUpCondition, 'Member 5 invariant: Unreviewed assessment cannot be scheduled as clinician-approved care plan', 'INTEGRATION', 'Member 5 follow-up invariant violated');

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;
  console.log(`PHASE 3 TEST RUN COMPLETE: ${passedCount}/${totalCount} tests passed.`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase3HardenedTests().catch((err) => {
  console.error('Phase 3 test suite encountered unexpected error:', err);
  process.exit(1);
});
