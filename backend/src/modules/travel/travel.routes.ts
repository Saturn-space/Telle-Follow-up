// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MODULE 4: TRAVEL OPTIMIZATION ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';
import { executeTravelComparison } from '@/lib/travel/comparison-service';
import { TravelComparisonRequestSchema } from '@/lib/travel/types';
import { SAVED_COMPARISONS } from '@/lib/travel/data-store';

const router = Router();

/**
 * POST /api/v1/travel/compare
 * Evaluates transit route, cost, and time trade-offs with safety escalation checks
 */
router.post('/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = TravelComparisonRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid travel comparison parameters.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const comparison = await executeTravelComparison(parseResult.data);
    res.status(200).json({
      success: true,
      data: comparison,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Travel comparison failed';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/travel/comparisons/:id
 * Retrieve a previously evaluated comparison record
 */
router.get('/comparisons/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const record = SAVED_COMPARISONS.get(req.params.id as string);
    if (!record) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Comparison '${req.params.id}' not found.` },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error retrieving comparison';
    res.status(500).json({ success: false, error: { message } });
  }
});

export default router;
