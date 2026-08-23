import { Router } from 'express';
import {
  getDonorProfile,
  updateDonorProfile,
  getDonorNotifications,
  markNotificationRead,
  respondToMatch
} from '../controllers/donorController.js';
import { requireDonor, requireAuth } from '../middleware/auth.js';

const router = Router();

// Profile
router.get('/profile', requireDonor, getDonorProfile);
router.put('/profile', requireDonor, updateDonorProfile);

// Notifications & Requests
router.get('/notifications', requireDonor, getDonorNotifications);
router.put('/notifications/:id/read', requireDonor, markNotificationRead);

// Match Acceptance / Decline
router.post('/matches/:id/accept', requireDonor, (req, res) => {
  req.body.action = 'ACCEPT';
  return respondToMatch(req, res);
});

router.post('/matches/:id/decline', requireDonor, (req, res) => {
  req.body.action = 'DECLINE';
  return respondToMatch(req, res);
});

export default router;
