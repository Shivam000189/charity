import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin, requireSubscriber } from '../middleware/role.middleware';
import {
  getMe,
  registerUser,
  confirmUser,
  testAuthenticated,
  testSubscriber,
  testAdmin,
} from '../controllers/auth.controller';

const router = Router();

router.post('/signup', registerUser);
router.post('/confirm', confirmUser);
router.get('/me', requireAuth, getMe);

// Authorization test routes
router.get('/test/authenticated', requireAuth, testAuthenticated);
router.get('/test/subscriber', requireAuth, requireSubscriber, testSubscriber);
router.get('/test/admin', requireAuth, requireAdmin, testAdmin);

export default router;
