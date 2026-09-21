import { Router } from 'express';
import { DrawController } from '../controllers/draw.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin, requireSubscriber } from '../middleware/role.middleware';

export const publicDrawRouter = Router();
export const adminDrawRouter = Router();

// Public routes
publicDrawRouter.get('/', DrawController.getPublicDraws);
publicDrawRouter.get('/:id', DrawController.getPublicDrawById);

// Subscriber routes
publicDrawRouter.get('/:id/my-entry', requireAuth, requireSubscriber, DrawController.getMyDrawEntry);

// Admin routes (requireAuth + requireAdmin)
adminDrawRouter.use(requireAuth, requireAdmin);

adminDrawRouter.get('/', DrawController.getAllDrawsAdmin);
adminDrawRouter.get('/:id', DrawController.getDrawByIdAdmin);
adminDrawRouter.post('/', DrawController.createDraw);
adminDrawRouter.patch('/:id', DrawController.updateDraw);
adminDrawRouter.delete('/:id', DrawController.deleteDraw);

// Lifecycle actions
adminDrawRouter.post('/:id/open', DrawController.openDraw);
adminDrawRouter.post('/:id/close', DrawController.closeDraw);
adminDrawRouter.post('/:id/simulate', DrawController.simulateDraw);
adminDrawRouter.post('/:id/publish', DrawController.publishDraw);
