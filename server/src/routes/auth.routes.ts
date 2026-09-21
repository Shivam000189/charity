import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin, requireSubscriber } from '../middleware/role.middleware';
import {
  getMe,
  testAuthenticated,
  testSubscriber,
  testAdmin,
} from '../controllers/auth.controller';

const router = Router();

router.get('/me', requireAuth, getMe);

// Authorization test routes
router.get('/test/authenticated', requireAuth, testAuthenticated);
router.get('/test/subscriber', requireAuth, requireSubscriber, testSubscriber);
router.get('/test/admin', requireAuth, requireAdmin, testAdmin);

export default router;
