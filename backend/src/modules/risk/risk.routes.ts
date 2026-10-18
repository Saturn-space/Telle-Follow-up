// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MODULE 2: AI RISK PREDICTION & CDS ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';
import { riskStore, SEEDED_PATIENT_CASES } from '@/lib/risk/store';
import { PatientRecoveryInput } from '@/lib/risk/types';

const router = Router();

/**
 * POST /api/v1/risk-assessments/evaluate
 * Triggers deterministic heuristic + AI hybrid risk evaluation
 */
router.post('/evaluate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, recoveryInput, enableAiExplanation } = req.body;

    let targetInput: PatientRecoveryInput;
    if (recoveryInput) {
      targetInput = recoveryInput;
    } else if (patientId && SEEDED_PATIENT_CASES[patientId]) {
      targetInput = SEEDED_PATIENT_CASES[patientId];
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Must provide either recoveryInput or a valid seeded patientId.',
        },
      });
      return;
    }

    const assessment = await riskStore.createAssessment(targetInput, {
      enableAiExplanation: enableAiExplanation ?? true,
    });

    res.status(201).json({
      success: true,
      data: assessment,
      metadata: {
        timestamp: new Date().toISOString(),
        engine: assessment.engine,
        engineVersion: assessment.engineVersion,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Evaluation failed';
    res.status(422).json({
      success: false,
      error: { code: 'EVALUATION_ERROR', message },
    });
  }
});

/**
 * GET /api/v1/risk-assessments/:id
 * Retrieve a specific risk assessment by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const assessmentId = req.params.id as string;
    const assessment = riskStore.getAssessmentById(assessmentId);
    if (!assessment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Risk assessment '${assessmentId}' not found.` },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve assessment';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/risk-assessments/:id/review
 * Clinician decision sign-off / override
 */
router.post('/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const assessmentId = req.params.id as string;
    const reviewData = req.body;

    const updated = riskStore.applyClinicianReview(assessmentId, reviewData);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assessment not found for review.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Clinician review recorded successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit review';
    res.status(422).json({ success: false, error: { message } });
  }
});

export default router;
