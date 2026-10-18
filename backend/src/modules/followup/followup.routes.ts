// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MODULE 5: CARE PLANS & APPOINTMENTS ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';
import { FollowUpService } from '@/lib/server/followup-service';
import { store } from '@/lib/server/store';

const router = Router();

/**
 * GET /api/v1/follow-ups/plans
 * Retrieve follow-up care plans (filterable by patientId)
 */
router.get('/plans', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.query;
    const plans = store.getAllPlans(typeof patientId === 'string' ? patientId : undefined);

    res.status(200).json({
      success: true,
      data: plans,
      meta: { total: plans.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve plans';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/follow-ups/plans
 * Create and activate a doctor-approved follow-up care plan
 */
router.post('/plans', (req: Request, res: Response): void => {
  try {
    const planInput = req.body;
    const result = FollowUpService.createPlan({
      patientId: planInput.patientId,
      title: planInput.title,
      clinicalSummary: planInput.clinicalSummary,
      riskAssessmentId: planInput.riskAssessmentId,
      travelComparisonId: planInput.travelComparisonId,
      startDate: planInput.startDate || new Date().toISOString(),
      targetCompletionDate: planInput.targetCompletionDate,
      approvedByClinician: req.user?.userId || 'doc-ramanathan',
    });

    if (result.error) {
      res.status(409).json({
        success: false,
        error: { message: result.error, isEscalated: result.isEscalated, riskStatus: result.riskStatus },
      });
      return;
    }

    res.status(201).json({ success: true, data: result.plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create plan';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/follow-ups/appointments
 * List appointments for a given patient
 */
router.get('/appointments', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.query;
    if (typeof patientId !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAM', message: 'Query parameter patientId is required.' },
      });
      return;
    }

    const appointments = store.getAppointmentsByPatient(patientId);
    res.status(200).json({
      success: true,
      data: appointments,
      meta: { total: appointments.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list appointments';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/follow-ups/appointments
 * Schedule a new consultation or local lab appointment
 */
router.post('/appointments', (req: Request, res: Response): void => {
  try {
    const appointmentInput = req.body;
    const result = FollowUpService.createAppointment({
      planId: appointmentInput.planId,
      patientId: appointmentInput.patientId,
      type: appointmentInput.type,
      locationOrService: appointmentInput.locationOrService || appointmentInput.title || 'Follow-up Consultation',
      scheduledStartTime: appointmentInput.scheduledStartTime,
      scheduledEndTime: appointmentInput.scheduledEndTime,
      providerId: appointmentInput.providerId,
      clinicalNotes: appointmentInput.clinicalNotes || appointmentInput.locationNotes,
    });

    if (result.error) {
      res.status(400).json({ success: false, error: { message: result.error } });
      return;
    }

    res.status(201).json({ success: true, data: result.appointment });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scheduling failed';
    res.status(500).json({ success: false, error: { message } });
  }
});

export default router;
