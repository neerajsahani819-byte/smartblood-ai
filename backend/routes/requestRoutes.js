import { Router } from 'express';
import {
  createEmergencyRequest,
  getRequests,
  getRequestById,
  getRequestMatches,
  recalculateMatches,
  getRequestAiInsights,
  notifyDonors,
  updateRequestStatus
} from '../controllers/requestController.js';
import { requireAuth, requireHospital } from '../middleware/auth.js';

const router = Router();

router.post('/', requireHospital, createEmergencyRequest);
router.get('/', requireAuth, getRequests);
router.get('/:id', requireAuth, getRequestById);
router.put('/:id', requireAuth, updateRequestStatus);
router.get('/:id/matches', requireAuth, getRequestMatches);
router.post('/:id/match', requireAuth, recalculateMatches);
router.get('/:id/ai-insights', requireAuth, getRequestAiInsights);
router.post('/:id/notify', requireAuth, notifyDonors);

export default router;
