import { Router } from 'express';
import { getHospitalDashboard } from '../controllers/hospitalController.js';
import { requireHospital } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', requireHospital, getHospitalDashboard);

export default router;
