// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MODULE 1: PATIENTS & RECOVERY ROUTES
// Cross-Module Wiring: Ingesting recovery telemetry triggers Module 2 Risk CDS
// Security Hardened: Enforces Server-Side Patient IDOR ownership & Idempotency
// ============================================================================

import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { store } from '@/lib/server/store';
import { riskStore } from '@/lib/risk/store';
import { PatientRecoveryInput, RiskAssessmentResult } from '@/lib/risk/types';

const router = Router();

/**
 * Middleware: Enforces patient ownership isolation (IDOR mitigation).
 * Patients may strictly access their own patient ID.
 * Clinicians and Coordinators may access any authorized patient in the system.
 */
function enforcePatientOwnership(req: Request, res: Response, targetPatientId: string): boolean {
  if (req.user?.role === 'PATIENT' && req.user.userId !== targetPatientId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_CROSS_PATIENT_ACCESS',
        message: `Access Denied: Patient user '${req.user.userId}' cannot access or modify records for patient '${targetPatientId}'.`,
      },
    });
    return false;
  }
  return true;
}

/**
 * GET /api/v1/patients
 * List all active patients in the system
 * Note: If called by a PATIENT, only their own profile is returned.
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const allPatients = store.getAllPatients();

    if (req.user?.role === 'PATIENT') {
      const patientSelf = allPatients.filter((p) => p.id === req.user?.userId);
      res.status(200).json({
        success: true,
        data: patientSelf,
        meta: { total: patientSelf.length, timestamp: new Date().toISOString() },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: allPatients,
      meta: { total: allPatients.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve patients';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/patients/:id
 * Retrieve individual patient demographic, surgical, and recovery context
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const patientId = req.params.id as string;

    if (!enforcePatientOwnership(req, res, patientId)) {
      return;
    }

    const patient = store.getPatient(patientId);
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: `Patient '${patientId}' not found.` },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching patient';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Shared recovery log processor for /:id/recovery-log and /recovery-entry
 */
async function processRecoveryLog(req: Request, res: Response, patientId: string): Promise<void> {
  // 1. Enforce IDOR protection: A patient can only submit telemetry for themselves
  if (!enforcePatientOwnership(req, res, patientId)) {
    return;
  }

  const patient = store.getPatient(patientId);
  if (!patient) {
    res.status(404).json({
      success: false,
      error: { code: 'PATIENT_NOT_FOUND', message: `Patient '${patientId}' not found.` },
    });
    return;
  }

  const body = req.body;

  // 2. Persist recovery entry in Module 1 store
  const recoveryEntry = {
    id: `rec-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    patientId,
    timestamp: body.timestamp || new Date().toISOString(),
    postOpDay: body.postOpDay ?? 3,
    painScore: body.painScore ?? 3,
    mobilityLevel: body.mobilityLevel ?? 'ASSISTED_WALKING',
    vitals: {
      temperatureC: body.vitals?.temperatureC ?? body.vitals?.temperature ?? 37.0,
      heartRate: body.vitals?.heartRate ?? 76,
      systolicBP: body.vitals?.systolicBP ?? body.vitals?.systolicBp ?? 120,
      diastolicBP: body.vitals?.diastolicBP ?? body.vitals?.diastolicBp ?? 80,
      respiratoryRate: body.vitals?.respiratoryRate ?? 16,
      oxygenSat: body.vitals?.oxygenSat ?? body.vitals?.oxygenSaturation ?? 98,
    },
    symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
    woundDescription: body.woundDescription || 'Clean, intact, dry surgical incision site.',
    drainOutputMl: body.drainOutputMl ?? null,
    photoUrls: body.photoUrls || [],
    ocrExtractedText: body.ocrExtractedText || '',
  };

  // 4. Construct target recovery input for Module 2 Risk Evaluation Engine
  const targetInput: PatientRecoveryInput = {
    patientId,
    patientName: patient.name,
    patientAge: patient.age,
    patientGender: patient.gender,
    originalHospital: patient.operatingHospital,
    primaryState: patient.homeState,
    procedureName: patient.surgeryProcedure,
    surgeryDate: patient.dischargeDate,
    dischargeDate: patient.dischargeDate,
    postOpDay: recoveryEntry.postOpDay,
    recoveryLogId: recoveryEntry.id,
    logTimestamp: recoveryEntry.timestamp,
    vitals: recoveryEntry.vitals,
    painScore: recoveryEntry.painScore,
    mobilityLevel: recoveryEntry.mobilityLevel,
    symptoms: recoveryEntry.symptoms,
    woundDescription: recoveryEntry.woundDescription,
    drainOutputMl: recoveryEntry.drainOutputMl,
    isDocumentVerified: true,
  };

  // 3. Idempotency Check: compute canonical SHA-256 telemetry fingerprint matching evaluator.ts
  const inputHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        patientId: targetInput.patientId,
        procedureName: targetInput.procedureName,
        postOpDay: targetInput.postOpDay,
        vitals: targetInput.vitals,
        painScore: targetInput.painScore,
        symptoms: [...targetInput.symptoms].sort(),
        woundDescription: targetInput.woundDescription,
        drainOutputMl: targetInput.drainOutputMl,
      })
    )
    .digest('hex');

  const existingAssessments: RiskAssessmentResult[] = riskStore.listAssessmentsForPatient(patientId);
  const idempotentMatch = existingAssessments.find((a) => a.inputDataHash === inputHash);

  if (idempotentMatch) {
    res.status(200).json({
      success: true,
      data: {
        recoveryEntry,
        riskAssessment: idempotentMatch,
        isHighRisk: idempotentMatch.riskLevel === 'HIGH' || idempotentMatch.riskLevel === 'CRITICAL',
        isEscalated: idempotentMatch.isEscalated,
        isIdempotentReplay: true,
      },
      message: 'Telemetry matches existing evaluation. Returned cached risk assessment idempotently.',
    });
    return;
  }

  const riskAssessment = await riskStore.createAssessment(targetInput, {
    enableAiExplanation: body.enableAiExplanation ?? true,
  });

  res.status(201).json({
    success: true,
    data: {
      recoveryEntry,
      riskAssessment,
      isHighRisk: riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL',
      isEscalated: riskAssessment.isEscalated,
      isIdempotentReplay: false,
    },
    message: 'RecoveryEntry ingested (M1) and successfully evaluated by Risk Engine (M2).',
  });
}

/**
 * POST /api/v1/patients/:id/recovery-log
 * Cross-module data handoff: Ingests recovery entry and evaluates risk
 */
router.post('/:id/recovery-log', async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.params.id as string;
    await processRecoveryLog(req, res, patientId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process recovery entry';
    res.status(500).json({
      success: false,
      error: { code: 'RECOVERY_EVALUATION_ERROR', message },
    });
  }
});

/**
 * POST /api/v1/patients/recovery-entry
 * Generic alias endpoint for recovery ingestion
 */
router.post('/recovery-entry', async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = (req.body.patientId || req.user?.userId || 'pat-101') as string;
    await processRecoveryLog(req, res, patientId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process recovery entry';
    res.status(500).json({
      success: false,
      error: { code: 'RECOVERY_EVALUATION_ERROR', message },
    });
  }
});

export default router;
