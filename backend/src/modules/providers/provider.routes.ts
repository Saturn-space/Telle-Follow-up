// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MODULE 3: LOCAL HEALTHCARE PROVIDERS & REFERRALS
// ============================================================================

import { Router, Request, Response } from 'express';
import { providerRepository } from '@/lib/db/provider-repository';
import { store } from '@/lib/server/store';

const router = Router();

/**
 * GET /api/v1/providers
 * Query verified local healthcare facilities with geo-filtering
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, service, facilityType } = req.query;

    const result = await providerRepository.searchFacilities({
      city: typeof city === 'string' ? city : undefined,
      services: typeof service === 'string' ? [service as any] : undefined,
      facilityType: typeof facilityType === 'string' ? [facilityType as any] : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        total: result.meta.totalCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Fallback to in-memory providers store if db unavailable
    const fallbackProviders = store.getAllProviders();
    res.status(200).json({
      success: true,
      data: fallbackProviders,
      meta: { total: fallbackProviders.length, isFallback: true },
    });
  }
});

/**
 * GET /api/v1/providers/:id
 * Retrieve details of a single healthcare facility
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const facilityId = req.params.id as string;
    const facility = await providerRepository.getFacilityById(facilityId);
    if (!facility) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Facility '${req.params.id}' not found.` },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: facility,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching facility';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/providers/referrals
 * Create a coordinated local care referral
 */
router.post('/referrals', async (req: Request, res: Response): Promise<void> => {
  try {
    const referralData = req.body;
    const referral = await providerRepository.createReferral(referralData);

    res.status(201).json({
      success: true,
      data: referral,
      message: 'Care referral created successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create referral';
    res.status(400).json({ success: false, error: { message } });
  }
});

export default router;
