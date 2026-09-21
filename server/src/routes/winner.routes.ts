import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import {
  getMyWinners,
  getWinnerDetail,
  uploadProof,
  getAllWinners,
  getPendingWinners,
  approveWinnerController,
  rejectWinnerController,
  markWinnerPaidController,
} from '../controllers/winner.controller';
import {
  getOverviewMetrics,
  getAggregateReports,
} from '../controllers/report.controller';
import {
  getUsers,
  getUserDetail,
  updateRole,
  editScore,
} from '../controllers/admin-user.controller';

// ── User Winner Routes ────────────────────────────────────────────────────────
export const winnerRouter = Router();

winnerRouter.get('/me', requireAuth, getMyWinners);
winnerRouter.get('/:winnerId', requireAuth, getWinnerDetail);
winnerRouter.post('/:winnerId/proof', requireAuth, uploadProof);

// ── Admin Winner Routes ───────────────────────────────────────────────────────
export const adminWinnerRouter = Router();

adminWinnerRouter.get('/', requireAuth, requireAdmin, getAllWinners);
adminWinnerRouter.get('/pending', requireAuth, requireAdmin, getPendingWinners);
adminWinnerRouter.get('/:winnerId', requireAuth, requireAdmin, getWinnerDetail);
adminWinnerRouter.post('/:winnerId/approve', requireAuth, requireAdmin, approveWinnerController);
adminWinnerRouter.post('/:winnerId/reject', requireAuth, requireAdmin, rejectWinnerController);
adminWinnerRouter.post('/:winnerId/mark-paid', requireAuth, requireAdmin, markWinnerPaidController);

// ── Admin Reports Routes ──────────────────────────────────────────────────────
export const adminReportRouter = Router();

adminReportRouter.get('/overview', requireAuth, requireAdmin, getOverviewMetrics);
adminReportRouter.get('/aggregate', requireAuth, requireAdmin, getAggregateReports);

// ── Admin Users Routes ────────────────────────────────────────────────────────
export const adminUserRouter = Router();

adminUserRouter.get('/', requireAuth, requireAdmin, getUsers);
adminUserRouter.get('/:id', requireAuth, requireAdmin, getUserDetail);
adminUserRouter.patch('/:id/role', requireAuth, requireAdmin, updateRole);
adminUserRouter.patch('/scores/:id', requireAuth, requireAdmin, editScore);
