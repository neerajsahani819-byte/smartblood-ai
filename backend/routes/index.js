import { Router } from 'express';
import authRoutes from './authRoutes.js';
import hospitalRoutes from './hospitalRoutes.js';
import requestRoutes from './requestRoutes.js';
import donorRoutes from './donorRoutes.js';
import adminRoutes from './adminRoutes.js';
import { getDonorNotifications, markNotificationRead, respondToMatch } from '../controllers/donorController.js';
import { requireDonor } from '../middleware/auth.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/hospitals', hospitalRoutes);
apiRouter.use('/requests', requestRoutes);
apiRouter.use('/donors', donorRoutes);
apiRouter.use('/admin', adminRoutes);

// Direct top-level aliases specified in the prompt
// /api/notifications
apiRouter.get('/notifications', requireDonor, getDonorNotifications);
apiRouter.put('/notifications/:id/read', requireDonor, markNotificationRead);

// /api/matches/:id/accept & decline
apiRouter.post('/matches/:id/accept', requireDonor, (req, res) => {
  req.body.action = 'ACCEPT';
  return respondToMatch(req, res);
});
apiRouter.post('/matches/:id/decline', requireDonor, (req, res) => {
  req.body.action = 'DECLINE';
  return respondToMatch(req, res);
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: 'SmartBlood AI Engine' });
});

export default apiRouter;
