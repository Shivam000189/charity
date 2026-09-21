import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireSubscriber } from '../middleware/subscription.middleware';
import {
  getScoresHandler,
  createScoreHandler,
  updateScoreHandler,
  deleteScoreHandler,
} from '../controllers/score.controller';

const router = Router();

// All score routes require active authentication and active subscriber access
router.use(requireAuth, requireSubscriber);

/**
 * GET /api/scores
 * Returns the user's latest 5 scores (sorted newest first by date).
 */
router.get('/', getScoresHandler);

/**
 * POST /api/scores
 * Adds a new score for the user and enforces atomic rolling-5 eviction.
 */
router.post('/', createScoreHandler);

/**
 * PATCH /api/scores/:id
 * Updates an existing score owned by the user.
 */
router.patch('/:id', updateScoreHandler);

/**
 * DELETE /api/scores/:id
 * Deletes a score owned by the user.
 */
router.delete('/:id', deleteScoreHandler);

export default router;
