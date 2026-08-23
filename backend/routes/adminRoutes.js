import { Router } from 'express';
import {
  getAdminStats,
  getAllDonors,
  getAllHospitals,
  toggleDonorVerification,
  toggleHospitalVerification
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/stats', requireAdmin, getAdminStats);
router.get('/donors', requireAdmin, getAllDonors);
router.get('/hospitals', requireAdmin, getAllHospitals);
router.put('/donors/:id/verify', requireAdmin, toggleDonorVerification);
router.put('/hospitals/:id/verify', requireAdmin, toggleHospitalVerification);

export default router;
