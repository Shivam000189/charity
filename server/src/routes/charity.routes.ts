import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { requireAdmin, requireSubscriber } from '../middleware/role.middleware';
import {
  getCharitiesHandler,
  getFeaturedCharitiesHandler,
  getCharityByIdHandler,
  getAdminCharitiesHandler,
  getAdminCharityByIdHandler,
  createCharityHandler,
  updateCharityHandler,
  deleteCharityHandler,
  uploadCharityImageHandler,
  getUserCharityPreferenceHandler,
  updateUserCharityPreferenceHandler,
  createDonationHandler,
  confirmDonationHandler,
} from '../controllers/charity.controller';

// ─── Public Charity Routes (/api/charities) ────────────────────────────────────
export const publicCharityRouter = Router();

publicCharityRouter.get('/', getCharitiesHandler);
publicCharityRouter.get('/featured', getFeaturedCharitiesHandler);
publicCharityRouter.get('/:id', getCharityByIdHandler);

// ─── Admin Charity Routes (/api/admin/charities) ───────────────────────────────
export const adminCharityRouter = Router();

adminCharityRouter.use(requireAuth, requireAdmin);

adminCharityRouter.get('/', getAdminCharitiesHandler);
adminCharityRouter.post('/', createCharityHandler);
adminCharityRouter.post('/upload', uploadCharityImageHandler);
adminCharityRouter.get('/:id', getAdminCharityByIdHandler);
adminCharityRouter.patch('/:id', updateCharityHandler);
adminCharityRouter.delete('/:id', deleteCharityHandler);

// ─── Subscription Charity Preference Routes (/api/subscriptions/charity) ──────
export const subscriptionCharityRouter = Router();

subscriptionCharityRouter.use(requireAuth, requireSubscriber);

subscriptionCharityRouter.get('/', getUserCharityPreferenceHandler);
subscriptionCharityRouter.put('/', updateUserCharityPreferenceHandler);

// ─── Independent Donation Routes (/api/donations) ─────────────────────────────
export const donationRouter = Router();

donationRouter.use(optionalAuth);

donationRouter.post('/', createDonationHandler);
donationRouter.post('/:id/confirm', confirmDonationHandler);
