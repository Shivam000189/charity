import { pool } from '../config/database';

export interface ScoreRecord {
  id: string;
  userId: string;
  score: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface SaveScoreParams {
  userId: string;
  score: number;
  date: string; // YYYY-MM-DD
}

export interface UpdateScoreParams {
  userId: string;
  scoreId: string;
  score?: number;
  date?: string; // YYYY-MM-DD
}

export class ScoreServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ScoreServiceError';
  }
}

function mapScoreRow(row: Record<string, unknown>): ScoreRecord {
  let dateFormatted: string;
  if (typeof row.score_date === 'string') {
    dateFormatted = row.score_date.slice(0, 10);
  } else if (row.score_date instanceof Date) {
    const d = row.score_date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateFormatted = `${year}-${month}-${day}`;
  } else {
    dateFormatted = String(row.score_date).slice(0, 10);
  }

  return {
    id: row.id as string,
    userId: row.user_id as string,
    score: Number(row.score),
    date: dateFormatted,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? String(row.created_at),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? String(row.updated_at),
  };
}

/**
 * Returns up to 5 scores for the specified user, sorted newest first by score_date DESC, created_at DESC.
 */
export async function getUserScores(userId: string): Promise<ScoreRecord[]> {
  const result = await pool.query(
    `SELECT id, user_id, score, score_date::text AS score_date, created_at, updated_at
       FROM public.scores
      WHERE user_id = $1
      ORDER BY score_date DESC, created_at DESC
      LIMIT 5`,
    [userId]
  );
  return result.rows.map(mapScoreRow);
}

/**
 * Saves a new score for the authenticated user and executes atomic rolling-5 eviction.
 *
 * Rules:
 *  - Enforces one score per date per user. Throws SCORE_ALREADY_EXISTS (409) if duplicate.
 *  - Rolling 5: In an atomic transaction, if the user now has > 5 scores, the oldest by
 *    score_date ASC, created_at ASC are deleted, leaving exactly 5 scores.
 *  - Returns evictedScoreId if an older score was evicted.
 */
export async function saveScore(params: SaveScoreParams): Promise<{
  score: ScoreRecord;
  scores: ScoreRecord[];
  evictedScoreId?: string;
}> {
  const { userId, score, date } = params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Duplicate date check
    const existing = await client.query(
      `SELECT id FROM public.scores WHERE user_id = $1 AND score_date = $2`,
      [userId, date]
    );

    if (existing.rows.length > 0) {
      throw new ScoreServiceError(
        'SCORE_ALREADY_EXISTS',
        'A score already exists for this date.',
        409,
        { existingScoreId: existing.rows[0].id }
      );
    }

    // 2. Insert new score
    const insertRes = await client.query(
      `INSERT INTO public.scores (user_id, score, score_date, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, user_id, score, score_date::text AS score_date, created_at, updated_at`,
      [userId, score, date]
    );

    const createdScore = mapScoreRow(insertRes.rows[0]);

    // 3. Enforce Rolling-5 eviction
    // Identify any IDs beyond the 5 most recent
    const overflowRes = await client.query(
      `SELECT id FROM public.scores
        WHERE user_id = $1
        ORDER BY score_date DESC, created_at DESC
        OFFSET 5`,
      [userId]
    );

    let evictedScoreId: string | undefined;
    if (overflowRes.rows.length > 0) {
      const idsToDelete = overflowRes.rows.map((r: { id: string }) => r.id);
      evictedScoreId = idsToDelete[0];
      await client.query(
        `DELETE FROM public.scores WHERE id = ANY($1::uuid[])`,
        [idsToDelete]
      );
    }

    // 4. Fetch the final updated set of <= 5 scores
    const latestRes = await client.query(
      `SELECT id, user_id, score, score_date::text AS score_date, created_at, updated_at
         FROM public.scores
        WHERE user_id = $1
        ORDER BY score_date DESC, created_at DESC
        LIMIT 5`,
      [userId]
    );

    await client.query('COMMIT');

    return {
      score: createdScore,
      scores: latestRes.rows.map(mapScoreRow),
      evictedScoreId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Updates an existing score owned by the user.
 *
 * Rules:
 *  - Enforces ownership: only modifies the row if user_id matches.
 *  - If date is modified, verifies no other score exists for this user on that date.
 *  - Editing does NOT alter total count, so rolling eviction does not trigger.
 */
export async function updateScore(params: UpdateScoreParams): Promise<{ score: ScoreRecord; scores: ScoreRecord[] }> {
  const { userId, scoreId, score, date } = params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch existing score & verify ownership
    const existing = await client.query(
      `SELECT id, score, score_date FROM public.scores WHERE id = $1 AND user_id = $2`,
      [scoreId, userId]
    );

    if (existing.rows.length === 0) {
      throw new ScoreServiceError(
        'SCORE_NOT_FOUND',
        'Score not found or you do not have permission to edit it.',
        404
      );
    }

    const current = existing.rows[0];
    const newScore = score !== undefined ? score : current.score;
    const newDate = date !== undefined ? date : current.score_date;

    // 2. If date changed, check collision with other scores of this user
    if (date !== undefined) {
      const collisionCheck = await client.query(
        `SELECT id FROM public.scores WHERE user_id = $1 AND score_date = $2 AND id != $3`,
        [userId, newDate, scoreId]
      );

      if (collisionCheck.rows.length > 0) {
        throw new ScoreServiceError(
          'SCORE_ALREADY_EXISTS',
          'A score already exists for the selected date.',
          409,
          { existingScoreId: collisionCheck.rows[0].id }
        );
      }
    }

    // 3. Update score
    const updateRes = await client.query(
      `UPDATE public.scores
          SET score      = $1,
              score_date = $2,
              updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        RETURNING id, user_id, score, score_date::text AS score_date, created_at, updated_at`,
      [newScore, newDate, scoreId, userId]
    );

    const updatedScore = mapScoreRow(updateRes.rows[0]);

    // 4. Fetch the refreshed list of scores
    const latestRes = await client.query(
      `SELECT id, user_id, score, score_date::text AS score_date, created_at, updated_at
         FROM public.scores
        WHERE user_id = $1
        ORDER BY score_date DESC, created_at DESC
        LIMIT 5`,
      [userId]
    );

    await client.query('COMMIT');

    return {
      score: updatedScore,
      scores: latestRes.rows.map(mapScoreRow),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Deletes a score owned by the user.
 *
 * Rules:
 *  - Enforces ownership: only deletes if id AND user_id match.
 *  - Returns 404 if not found or belongs to another user.
 */
export async function deleteScore(userId: string, scoreId: string): Promise<{ deletedId: string; scores: ScoreRecord[] }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const checkRes = await client.query(
      `SELECT id FROM public.scores WHERE id = $1 AND user_id = $2`,
      [scoreId, userId]
    );

    if (checkRes.rows.length === 0) {
      throw new ScoreServiceError(
        'SCORE_NOT_FOUND',
        'Score not found or you do not have permission to delete it.',
        404
      );
    }

    await client.query(
      `DELETE FROM public.scores WHERE id = $1 AND user_id = $2`,
      [scoreId, userId]
    );

    const latestRes = await client.query(
      `SELECT id, user_id, score, score_date::text AS score_date, created_at, updated_at
         FROM public.scores
        WHERE user_id = $1
        ORDER BY score_date DESC, created_at DESC
        LIMIT 5`,
      [userId]
    );

    await client.query('COMMIT');

    return {
      deletedId: scoreId,
      scores: latestRes.rows.map(mapScoreRow),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
