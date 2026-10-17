// Tele-Follow-Up Orchestrator - Deterministic Physiological Safety & Rule Engine
// Implements transparent clinical checks, data quality alerts, and red-flag escalation.

import {
  PatientRecoveryInput,
  RiskLevel,
  SupportingFactor,
  DataQualityAlert,
  FactorImpact,
} from './types';

export interface RuleEvaluationResult {
  riskLevel: RiskLevel;
  heuristicScore: number; // 0 - 100 additive triage index
  requiresInPerson: boolean;
  isEscalated: boolean;
  escalationReason: string | null;
  contributingFactors: SupportingFactor[];
  dataQualityAlerts: DataQualityAlert[];
  missingDataFlags: string[];
  limitations: string[];
  clinicalSummary: string;
}

export function evaluateDeterministicRules(input: PatientRecoveryInput): RuleEvaluationResult {
  const factors: SupportingFactor[] = [];
  const alerts: DataQualityAlert[] = [];
  const missingFlags: string[] = [];
  const limitations: string[] = [
    'Advisory decision-support prototype only. Not a clinically validated diagnostic device.',
    'Heuristic scores are additive prioritization indicators, NOT epidemiological risk percentages or prognostic diagnoses.',
    'A low score does not rule out evolving deep-surgical complications. Human clinical review is required.',
  ];

  let rawScore = 0;
  let isEscalated = false;
  let escalationReason: string | null = null;
  let requiresInPerson = false;

  const { vitals, symptoms, painScore, woundDescription, postOpDay } = input;

  // ---------------------------------------------------------------------------
  // 1. DATA SUFFICIENCY & SANITY CHECKS
  // ---------------------------------------------------------------------------
  if (!vitals.temperatureC) {
    missingFlags.push('Temperature (°C)');
    alerts.push({
      alertId: 'alert_missing_temp',
      type: 'MISSING_DATA',
      severity: 'WARNING',
      headline: 'Body Temperature Not Recorded',
      detailedMessage: 'Post-operative fever or hypothermia cannot be assessed without current body temperature. Patient should record oral/tympanic reading.',
      affectedFields: ['vitals.temperatureC'],
    });
  }

  if (!vitals.heartRate) {
    missingFlags.push('Heart Rate (bpm)');
    alerts.push({
      alertId: 'alert_missing_hr',
      type: 'MISSING_DATA',
      severity: 'WARNING',
      headline: 'Heart Rate Not Recorded',
      detailedMessage: 'Hemodynamic stability cannot be fully evaluated without pulse/heart rate measurements.',
      affectedFields: ['vitals.heartRate'],
    });
  }

  if (!vitals.systolicBP || !vitals.diastolicBP) {
    missingFlags.push('Blood Pressure (mmHg)');
    alerts.push({
      alertId: 'alert_missing_bp',
      type: 'MISSING_DATA',
      severity: 'INFO',
      headline: 'Blood Pressure Incomplete',
      detailedMessage: 'No current blood pressure reported. Shock index calculation is unavailable.',
      affectedFields: ['vitals.systolicBP', 'vitals.diastolicBP'],
    });
  } else if (vitals.systolicBP <= vitals.diastolicBP) {
    // Inconsistent anatomical blood pressure reading
    alerts.push({
      alertId: 'alert_invalid_bp_ratio',
      type: 'SUSPICIOUS_VALUE',
      severity: 'CRITICAL',
      headline: 'Physiologically Inconsistent Blood Pressure',
      detailedMessage: `Systolic blood pressure (${vitals.systolicBP} mmHg) cannot be lower than or equal to diastolic blood pressure (${vitals.diastolicBP} mmHg). Measurement rejected.`,
      affectedFields: ['vitals.systolicBP', 'vitals.diastolicBP'],
    });
    rawScore += 25;
    requiresInPerson = true;
  }

  // Stale observation check (> 48 hours old)
  if (input.logTimestamp) {
    const logTime = new Date(input.logTimestamp).getTime();
    const ageHours = (Date.now() - logTime) / (1000 * 60 * 60);
    if (ageHours > 48) {
      alerts.push({
        alertId: 'alert_stale_observations',
        type: 'STALE_DATA',
        severity: 'WARNING',
        headline: `Recovery Observations Stale (${Math.round(ageHours)} Hours Old)`,
        detailedMessage: 'The patient recovery observations are older than 48 hours. Clinical state may have evolved. Fresh vitals should be requested prior to final follow-up planning.',
        affectedFields: ['logTimestamp'],
      });
      missingFlags.push('Current Vitals (< 48 hrs)');
    }
  }

  // ---------------------------------------------------------------------------
  // 2. CRITICAL SURGICAL RED FLAGS (Immediate Emergency Escalation)
  // ---------------------------------------------------------------------------
  const redFlagSymptoms = [
    { key: 'active bleeding', text: 'Active uncontained hemorrhage or saturated surgical dressings' },
    { key: 'chest pain', text: 'Acute chest pain or suspected pulmonary embolism / cardiac event' },
    { key: 'severe shortness of breath', text: 'Severe acute dyspnea / respiratory distress' },
    { key: 'wound opened', text: 'Surgical incision wound dehiscence or exposed deep tissue' },
    { key: 'loss of consciousness', text: 'Syncope, acute confusion, or altered mental status' },
    { key: 'inability to urinate', text: 'Acute urinary retention (>8 hours post-catheter removal)' },
  ];

  for (const rf of redFlagSymptoms) {
    const hasSymptom = symptoms.some(s => s.toLowerCase().includes(rf.key)) ||
      (woundDescription && woundDescription.toLowerCase().includes(rf.key));

    if (hasSymptom) {
      isEscalated = true;
      escalationReason = `CRITICAL RED FLAG DETECTED: ${rf.text}. Immediate hospital emergency evaluation required.`;
      requiresInPerson = true;

      factors.push({
        factorId: `rf_${rf.key.replace(/\s+/g, '_')}`,
        category: 'SYSTEMIC',
        factorTitle: `Emergency Red Flag: ${rf.key.toUpperCase()}`,
        description: rf.text,
        impact: 'CRITICAL_TRIGGER',
        sourceFieldRef: 'RecoveryLog.symptoms',
        observedValue: rf.key,
      });

      alerts.push({
        alertId: `alert_rf_${rf.key.replace(/\s+/g, '_')}`,
        type: 'RED_FLAG',
        severity: 'CRITICAL',
        headline: `URGENT RED FLAG: ${rf.key.toUpperCase()}`,
        detailedMessage: `Patient report indicates ${rf.text}. Do NOT attempt travel optimization or routine follow-up delay. Seek immediate emergency medical care.`,
        affectedFields: ['symptoms', 'woundDescription'],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. VITAL SIGN PHYSIOLOGICAL CHECKS
  // ---------------------------------------------------------------------------
  // A. Temperature
  if (vitals.temperatureC != null) {
    if (vitals.temperatureC >= 38.5) {
      rawScore += 35;
      requiresInPerson = true;
      factors.push({
        factorId: 'vf_temp_high',
        category: 'VITALS',
        factorTitle: 'High Grade Post-Operative Fever',
        description: `Recorded temperature of ${vitals.temperatureC}°C exceeds the 38.5°C threshold, suggesting potential surgical site infection, bacteremia, or systemic inflammation.`,
        impact: 'HIGH_RISK_FACTOR',
        sourceFieldRef: 'RecoveryLog.temperatureC',
        observedValue: `${vitals.temperatureC} °C`,
        referenceRange: '36.5 - 37.5 °C',
      });
    } else if (vitals.temperatureC >= 38.0) {
      rawScore += 18;
      factors.push({
        factorId: 'vf_temp_mod',
        category: 'VITALS',
        factorTitle: 'Low Grade Post-Operative Fever',
        description: `Temperature ${vitals.temperatureC}°C is mildly elevated. Monitoring for atelectasis, drug reaction, or early infection recommended.`,
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.temperatureC',
        observedValue: `${vitals.temperatureC} °C`,
        referenceRange: '36.5 - 37.5 °C',
      });
    } else if (vitals.temperatureC < 35.5) {
      rawScore += 20;
      factors.push({
        factorId: 'vf_temp_low',
        category: 'VITALS',
        factorTitle: 'Hypothermia Observed',
        description: `Core body temperature ${vitals.temperatureC}°C is abnormally low.`,
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.temperatureC',
        observedValue: `${vitals.temperatureC} °C`,
        referenceRange: '36.5 - 37.5 °C',
      });
    } else {
      factors.push({
        factorId: 'vf_temp_norm',
        category: 'VITALS',
        factorTitle: 'Normothermic Body Temperature',
        description: `Body temperature ${vitals.temperatureC}°C is within standard physiological limits.`,
        impact: 'NORMAL_BASELINE',
        sourceFieldRef: 'RecoveryLog.temperatureC',
        observedValue: `${vitals.temperatureC} °C`,
        referenceRange: '36.5 - 37.5 °C',
      });
    }
  }

  // B. Heart Rate & Shock Index
  if (vitals.heartRate != null) {
    if (vitals.heartRate > 120) {
      rawScore += 30;
      requiresInPerson = true;
      factors.push({
        factorId: 'vf_hr_severe',
        category: 'VITALS',
        factorTitle: 'Severe Resting Tachycardia',
        description: `Heart rate of ${vitals.heartRate} bpm indicates significant cardiovascular compensation, pain, hypovolemia, or systemic sepsis.`,
        impact: 'HIGH_RISK_FACTOR',
        sourceFieldRef: 'RecoveryLog.heartRate',
        observedValue: `${vitals.heartRate} bpm`,
        referenceRange: '60 - 100 bpm',
      });
    } else if (vitals.heartRate > 100) {
      rawScore += 15;
      factors.push({
        factorId: 'vf_hr_mod',
        category: 'VITALS',
        factorTitle: 'Moderate Tachycardia',
        description: `Heart rate of ${vitals.heartRate} bpm is elevated above resting baseline.`,
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.heartRate',
        observedValue: `${vitals.heartRate} bpm`,
        referenceRange: '60 - 100 bpm',
      });
    } else {
      factors.push({
        factorId: 'vf_hr_norm',
        category: 'VITALS',
        factorTitle: 'Stable Resting Pulse',
        description: `Heart rate of ${vitals.heartRate} bpm is within normal resting limits.`,
        impact: 'NORMAL_BASELINE',
        sourceFieldRef: 'RecoveryLog.heartRate',
        observedValue: `${vitals.heartRate} bpm`,
        referenceRange: '60 - 100 bpm',
      });
    }
  }

  // Shock Index check (HR / Systolic BP)
  if (vitals.heartRate && vitals.systolicBP) {
    const shockIndex = vitals.heartRate / vitals.systolicBP;
    if (shockIndex >= 1.0) {
      rawScore += 35;
      isEscalated = true;
      escalationReason = `CRITICAL SHOCK INDEX: ${shockIndex.toFixed(2)} (HR ${vitals.heartRate} / SBP ${vitals.systolicBP}). High concern for occult hemorrhage or septic shock.`;
      requiresInPerson = true;
      factors.push({
        factorId: 'vf_shock_index',
        category: 'VITALS',
        factorTitle: 'Elevated Shock Index (≥ 1.0)',
        description: `Shock Index is ${shockIndex.toFixed(2)} (normal < 0.7). Reflects hemodynamic compromise requiring immediate clinical evaluation.`,
        impact: 'CRITICAL_TRIGGER',
        sourceFieldRef: 'RecoveryLog.systolicBP + heartRate',
        observedValue: shockIndex.toFixed(2),
        referenceRange: '< 0.70',
      });
    } else if (shockIndex >= 0.85) {
      rawScore += 15;
      factors.push({
        factorId: 'vf_shock_borderline',
        category: 'VITALS',
        factorTitle: 'Borderline Shock Index',
        description: `Shock Index is ${shockIndex.toFixed(2)}. Suggests borderline intravascular volume depletion or mild stress response.`,
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.systolicBP + heartRate',
        observedValue: shockIndex.toFixed(2),
        referenceRange: '< 0.70',
      });
    }
  }

  // C. Oxygen Saturation
  if (vitals.oxygenSat != null) {
    if (vitals.oxygenSat < 90) {
      rawScore += 35;
      isEscalated = true;
      escalationReason = `SEVERE HYPOXEMIA: SpO2 ${vitals.oxygenSat}%. Risk of atelectasis, pneumonia, or pulmonary embolism. Urgent evaluation needed.`;
      requiresInPerson = true;
      factors.push({
        factorId: 'vf_spo2_crit',
        category: 'VITALS',
        factorTitle: 'Severe Hypoxemia (< 90%)',
        description: `Oxygen saturation ${vitals.oxygenSat}% is dangerously low on ambient air.`,
        impact: 'CRITICAL_TRIGGER',
        sourceFieldRef: 'RecoveryLog.oxygenSat',
        observedValue: `${vitals.oxygenSat}%`,
        referenceRange: '≥ 95%',
      });
    } else if (vitals.oxygenSat < 94) {
      rawScore += 15;
      factors.push({
        factorId: 'vf_spo2_mod',
        category: 'VITALS',
        factorTitle: 'Mild Hypoxemia (< 94%)',
        description: `Oxygen saturation ${vitals.oxygenSat}% is sub-optimal. Encouraging deep breathing / spirometry recommended.`,
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.oxygenSat',
        observedValue: `${vitals.oxygenSat}%`,
        referenceRange: '≥ 95%',
      });
    }
  }

  // D. Respiratory Rate
  if (vitals.respiratoryRate != null) {
    if (vitals.respiratoryRate < 8) {
      rawScore += 35;
      isEscalated = true;
      escalationReason = `CRITICAL BRADYPNEA: Respiratory rate ${vitals.respiratoryRate} breaths/min. Immediate risk of acute respiratory arrest or opioid-induced depression.`;
      requiresInPerson = true;
      factors.push({
        factorId: 'vf_rr_crit_low',
        category: 'VITALS',
        factorTitle: 'Severe Bradypnea (< 8/min)',
        description: `Respiratory rate ${vitals.respiratoryRate} breaths/min is dangerously depressed. Immediate emergency evaluation required.`,
        impact: 'CRITICAL_TRIGGER',
        sourceFieldRef: 'RecoveryLog.respiratoryRate',
        observedValue: `${vitals.respiratoryRate} /min`,
        referenceRange: '12 - 20 /min',
      });
    } else if (vitals.respiratoryRate >= 28) {
      rawScore += 22;
      requiresInPerson = true;
      factors.push({
        factorId: 'vf_rr_severe_high',
        category: 'VITALS',
        factorTitle: 'Severe Tachypnea (≥ 28/min)',
        description: `Respiratory rate ${vitals.respiratoryRate} breaths/min reflects marked respiratory effort or metabolic distress.`,
        impact: 'HIGH_RISK_FACTOR',
        sourceFieldRef: 'RecoveryLog.respiratoryRate',
        observedValue: `${vitals.respiratoryRate} /min`,
        referenceRange: '12 - 20 /min',
      });
    } else if (vitals.respiratoryRate >= 22) {
      rawScore += 12;
      factors.push({
        factorId: 'vf_rr_mod_high',
        category: 'VITALS',
        factorTitle: 'Mild Tachypnea (≥ 22/min)',
        description: `Respiratory rate ${vitals.respiratoryRate} breaths/min is elevated. qSOFA respiratory criterion met.`,
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.respiratoryRate',
        observedValue: `${vitals.respiratoryRate} /min`,
        referenceRange: '12 - 20 /min',
      });
    } else {
      factors.push({
        factorId: 'vf_rr_normal',
        category: 'VITALS',
        factorTitle: 'Normal Respiratory Rate',
        description: `Respiratory rate ${vitals.respiratoryRate} breaths/min is within standard resting limits.`,
        impact: 'NORMAL_BASELINE',
        sourceFieldRef: 'RecoveryLog.respiratoryRate',
        observedValue: `${vitals.respiratoryRate} /min`,
        referenceRange: '12 - 20 /min',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. SURGICAL SITE WOUND & DRAIN ASSESSMENT
  // ---------------------------------------------------------------------------
  if (woundDescription) {
    const descLower = woundDescription.toLowerCase();
    const hasPurulentKeyword = descLower.includes('pus') || descLower.includes('purulent') || descLower.includes('malodorous') || descLower.includes('foul');
    const isNegatedPurulent = descLower.includes('no purulent') || descLower.includes('no pus') || descLower.includes('without pus') || descLower.includes('without purulent') || descLower.includes('non-purulent');

    if (hasPurulentKeyword && !isNegatedPurulent) {
      rawScore += 25;
      requiresInPerson = true;
      factors.push({
        factorId: 'wf_purulence',
        category: 'WOUND',
        factorTitle: 'Purulent Wound Drainage',
        description: 'Exudate described as purulent or foul-smelling. Highly suggestive of localized surgical site infection (SSI). In-person wound swab / inspection indicated.',
        impact: 'HIGH_RISK_FACTOR',
        sourceFieldRef: 'RecoveryLog.woundDescription',
        observedValue: woundDescription,
      });
    } else if (descLower.includes('redness') || descLower.includes('erythema') || descLower.includes('warmth') || descLower.includes('swelling')) {
      rawScore += 12;
      factors.push({
        factorId: 'wf_erythema',
        category: 'WOUND',
        factorTitle: 'Periwound Erythema / Edema',
        description: 'Marginal erythema or swelling noted around surgical incision. Requires close monitoring for progression.',
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.woundDescription',
        observedValue: woundDescription,
      });
    } else if (descLower.includes('clean') || descLower.includes('dry') || descLower.includes('intact') || descLower.includes('well approximated')) {
      factors.push({
        factorId: 'wf_healthy',
        category: 'WOUND',
        factorTitle: 'Healthy Wound Healing',
        description: 'Incision reported as clean, dry, and intact with no abnormal drainage.',
        impact: 'NORMAL_BASELINE',
        sourceFieldRef: 'RecoveryLog.woundDescription',
        observedValue: woundDescription,
      });
    }
  }

  // Drain output check
  if (input.drainOutputMl != null) {
    if (input.drainOutputMl > 250) {
      rawScore += 25;
      requiresInPerson = true;
      factors.push({
        factorId: 'df_high_output',
        category: 'WOUND',
        factorTitle: 'High Drain Output Volume',
        description: `Drain output is high (${input.drainOutputMl} mL/day). Risk of active seroma, hematoma, or visceral leak.`,
        impact: 'HIGH_RISK_FACTOR',
        sourceFieldRef: 'RecoveryLog.drainOutputMl',
        observedValue: `${input.drainOutputMl} mL`,
        referenceRange: '< 100 mL/day',
      });
    } else if (input.drainOutputMl > 100) {
      rawScore += 10;
      factors.push({
        factorId: 'df_mod_output',
        category: 'WOUND',
        factorTitle: 'Moderate Drain Output',
        description: `Drain output is ${input.drainOutputMl} mL/day. Continue monitoring daily volume trend.`,
        impact: 'MODERATE_ELEVATION',
        sourceFieldRef: 'RecoveryLog.drainOutputMl',
        observedValue: `${input.drainOutputMl} mL`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. PAIN LEVEL ASSESSMENT
  // ---------------------------------------------------------------------------
  if (painScore >= 8) {
    rawScore += 20;
    factors.push({
      factorId: 'pf_severe',
      category: 'PAIN',
      factorTitle: 'Severe Breakthrough Pain (≥ 8/10)',
      description: `Pain score of ${painScore}/10 indicates uncontrolled pain requiring clinical reassessment of analgesic regimen or underlying surgical pathology.`,
      impact: 'HIGH_RISK_FACTOR',
      sourceFieldRef: 'RecoveryLog.painScore',
      observedValue: `${painScore}/10`,
      referenceRange: '< 4/10',
    });
  } else if (painScore >= 5) {
    rawScore += 8;
    factors.push({
      factorId: 'pf_moderate',
      category: 'PAIN',
      factorTitle: 'Moderate Post-Operative Pain',
      description: `Pain score of ${painScore}/10 is within manageable post-op expectations but warrants medication review.`,
      impact: 'MODERATE_ELEVATION',
      sourceFieldRef: 'RecoveryLog.painScore',
      observedValue: `${painScore}/10`,
    });
  } else {
    factors.push({
      factorId: 'pf_mild',
      category: 'PAIN',
      factorTitle: 'Adequately Controlled Pain',
      description: `Pain score of ${painScore}/10 is well controlled.`,
      impact: 'NORMAL_BASELINE',
      sourceFieldRef: 'RecoveryLog.painScore',
      observedValue: `${painScore}/10`,
    });
  }

  // ---------------------------------------------------------------------------
  // 6. FINAL RISK STRATIFICATION
  // ---------------------------------------------------------------------------
  // Clamp score to 0 - 100
  const normalizedScore = Math.min(100, Math.max(0, rawScore));

  let finalRiskLevel: RiskLevel;

  if (isEscalated) {
    finalRiskLevel = 'CRITICAL';
  } else if (missingFlags.length >= 2 && normalizedScore < 20) {
    // If multiple critical vitals are missing, do NOT assign a false 'LOW'
    finalRiskLevel = 'INDETERMINATE';
    alerts.push({
      alertId: 'alert_insufficient_vitals',
      type: 'MISSING_DATA',
      severity: 'WARNING',
      headline: 'Risk Category Indeterminate Due to Incomplete Vitals',
      detailedMessage: 'Multiple vital parameters are absent. The system will not output a reassuring "LOW" risk score until essential recovery data is supplied.',
      affectedFields: missingFlags,
    });
  } else if (normalizedScore >= 50) {
    finalRiskLevel = 'HIGH';
    requiresInPerson = true;
  } else if (normalizedScore >= 20) {
    finalRiskLevel = 'MODERATE';
  } else {
    finalRiskLevel = 'LOW';
  }

  // Build plain-language clinical summary
  let clinicalSummary = '';
  if (finalRiskLevel === 'CRITICAL') {
    clinicalSummary = `CRITICAL ALERT: Emergency indicators triggered for Post-Op Day ${postOpDay} following ${input.procedureName}. ${escalationReason || 'Severe hemodynamic or surgical complication detected.'} Immediate in-person hospital evaluation is urgently indicated.`;
  } else if (finalRiskLevel === 'HIGH') {
    clinicalSummary = `Elevated risk indicators identified for Post-Op Day ${postOpDay} (${input.procedureName}). Clinical findings suggest significant recovery deviations (score index ${normalizedScore}/100) warranting prompt in-person clinical review.`;
  } else if (finalRiskLevel === 'MODERATE') {
    clinicalSummary = `Moderate risk considerations noted for Post-Op Day ${postOpDay}. Certain recovery observations warrant clinician follow-up or local clinic assessment, though no immediate acute emergencies are present.`;
  } else if (finalRiskLevel === 'INDETERMINATE') {
    clinicalSummary = `Risk status is currently indeterminate due to missing recovery parameters (${missingFlags.join(', ')}). Patient should complete essential vital measurements before follow-up coordination.`;
  } else {
    clinicalSummary = `Recovery parameters for Post-Op Day ${postOpDay} (${input.procedureName}) demonstrate expected healing trajectory (score index ${normalizedScore}/100). Baseline vitals and reported pain are within expected ranges. Candidate for virtual teleconsultation follow-up.`;
  }

  return {
    riskLevel: finalRiskLevel,
    heuristicScore: normalizedScore,
    requiresInPerson,
    isEscalated,
    escalationReason,
    contributingFactors: factors,
    dataQualityAlerts: alerts,
    missingDataFlags: missingFlags,
    limitations,
    clinicalSummary,
  };
}
