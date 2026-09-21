import { Request, Response } from 'express';
import '../types/auth';
import {
  getUserScores,
  saveScore,
  updateScore,
  deleteScore,
  ScoreServiceError,
} from '../services/score.service';
import {
  validateScoreInput,
  validateScoreValue,
  validateScoreDate,
} from '../utils/score.validation';

/**
 * GET /api/scores
 * Returns the authenticated user's scores (up to 5, sorted newest first).
 */
export const getScoresHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.',
      });
      return;
    }

    const scores = await getUserScores(userId);
    res.status(200).json({
      success: true,
      data: scores,
    });
  } catch (err: unknown) {
    console.error('[Score] getScores error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'FETCH_SCORES_FAILED',
      message: 'Failed to retrieve scores.',
    });
  }
};

/**
 * POST /api/scores
 * Creates a new score for the authenticated user and applies atomic rolling-5 eviction.
 */
export const createScoreHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.',
      });
      return;
    }

    const body = (req.body || {}) as { score?: unknown; date?: unknown };
    const validation = validateScoreInput(body);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        code: validation.error.code,
        message: validation.error.message,
      });
      return;
    }

    const result = await saveScore({
      userId,
      score: validation.data.score,
      date: validation.data.date,
    });

    res.status(201).json({
      success: true,
      message: result.evictedScoreId
        ? 'Score recorded successfully. Oldest score was evicted (rolling 5).'
        : 'Score recorded successfully.',
      data: result.score,
      scores: result.scores,
      ...(result.evictedScoreId ? { evictedScoreId: result.evictedScoreId } : {}),
    });
  } catch (err: unknown) {
    if (err instanceof ScoreServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
        ...(err.extra || {}),
      });
      return;
    }

    console.error('[Score] createScore error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'CREATE_SCORE_FAILED',
      message: 'An error occurred while saving the score.',
    });
  }
};

/**
 * PATCH /api/scores/:id
 * Updates an existing score owned by the user.
 */
export const updateScoreHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.',
      });
      return;
    }

    const scoreId = req.params.id as string;
    if (!scoreId) {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'Score ID parameter is required.',
      });
      return;
    }

    const body = (req.body || {}) as { score?: unknown; date?: unknown };

    let validatedScore: number | undefined;
    if (body.score !== undefined) {
      const scoreVal = validateScoreValue(body.score);
      if (!scoreVal.valid) {
        res.status(400).json({
          success: false,
          code: scoreVal.error.code,
          message: scoreVal.error.message,
        });
        return;
      }
      validatedScore = scoreVal.score;
    }

    let validatedDate: string | undefined;
    if (body.date !== undefined) {
      const dateVal = validateScoreDate(body.date);
      if (!dateVal.valid) {
        res.status(400).json({
          success: false,
          code: dateVal.error.code,
          message: dateVal.error.message,
        });
        return;
      }
      validatedDate = dateVal.date;
    }

    if (validatedScore === undefined && validatedDate === undefined) {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'At least one field (score or date) must be provided to update.',
      });
      return;
    }

    const result = await updateScore({
      userId,
      scoreId,
      score: validatedScore,
      date: validatedDate,
    });

    res.status(200).json({
      success: true,
      message: 'Score updated successfully.',
      data: result.score,
      scores: result.scores,
    });
  } catch (err: unknown) {
    if (err instanceof ScoreServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
        ...(err.extra || {}),
      });
      return;
    }

    console.error('[Score] updateScore error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'UPDATE_SCORE_FAILED',
      message: 'An error occurred while updating the score.',
    });
  }
};

/**
 * DELETE /api/scores/:id
 * Deletes a score owned by the user.
 */
export const deleteScoreHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.',
      });
      return;
    }

    const scoreId = req.params.id as string;
    if (!scoreId) {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'Score ID parameter is required.',
      });
      return;
    }

    const result = await deleteScore(userId, scoreId);

    res.status(200).json({
      success: true,
      message: 'Score deleted successfully.',
      deletedId: result.deletedId,
      scores: result.scores,
    });
  } catch (err: unknown) {
    if (err instanceof ScoreServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Score] deleteScore error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'DELETE_SCORE_FAILED',
      message: 'An error occurred while deleting the score.',
    });
  }
};
