import { Router } from 'express';
import { hospitalLogin, donorLogin, donorRegister, adminLogin, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/hospital/login', hospitalLogin);
router.post('/donor/login', donorLogin);
router.post('/donor/register', donorRegister);
router.post('/admin/login', adminLogin);
router.get('/me', requireAuth, getMe);

export default router;
