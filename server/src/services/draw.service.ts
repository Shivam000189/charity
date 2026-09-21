import { pool } from '../config/database';
import {
  generateRandomNumbers,
  generateScoreWeightedNumbers,
  calculatePrizePool,
  evaluateMatches,
  EvaluatedWinner,
} from '../utils/draw.math';
import {
  ValidatedDrawInput,
  DrawStatus,
  isValidDrawTransition,
} from '../utils/draw.validation';

export interface DrawRecord {
  id: string;
  name: string;
  description: string | null;
  charityId: string | null;
  drawType: 'RANDOM' | 'SCORE_WEIGHTED';
  scheduledMonth: string | null;
  drawDate: string;
  entryDeadline: string;
  status: DrawStatus;
  threeMatchPercentage: number;
  fourMatchPercentage: number;
  fiveMatchPercentage: number;
  drawnNumbers: number[] | null;
  prizeAmount: number;
  threeMatchPool: number;
  fourMatchPool: number;
  fiveMatchPool: number;
  jackpotRolloverAmount: number;
  rolledOverToNext: number;
  simulationData: Record<string, unknown> | null;
  entryCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DrawEntryRecord {
  id: string;
  drawId: string;
  userId: string;
  scoreId: string | null;
  numbers: number[];
  createdAt: string;
}

export interface WinnerRecord {
  id: string;
  drawId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  drawEntryId: string;
  rank: number;
  matchCount: 3 | 4 | 5;
  prizeAmount: number;
  currency: string;
  createdAt: string;
}

export class DrawServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DrawServiceError';
  }
}

function mapDrawRow(row: Record<string, unknown>): DrawRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || null,
    charityId: (row.charity_id as string) || null,
    drawType: (row.draw_type as 'RANDOM' | 'SCORE_WEIGHTED') || 'RANDOM',
    scheduledMonth: (row.scheduled_month as string) || null,
    drawDate: (row.draw_date as Date)?.toISOString?.() ?? String(row.draw_date),
    entryDeadline: (row.entry_deadline as Date)?.toISOString?.() ?? String(row.entry_deadline),
    status: row.status as DrawStatus,
    threeMatchPercentage: parseFloat(String(row.three_match_percentage || 25)),
    fourMatchPercentage: parseFloat(String(row.four_match_percentage || 35)),
    fiveMatchPercentage: parseFloat(String(row.five_match_percentage || 40)),
    drawnNumbers: Array.isArray(row.drawn_numbers) ? (row.drawn_numbers as number[]) : null,
    prizeAmount: parseFloat(String(row.prize_amount || 0)),
    threeMatchPool: parseFloat(String(row.three_match_pool || 0)),
    fourMatchPool: parseFloat(String(row.four_match_pool || 0)),
    fiveMatchPool: parseFloat(String(row.five_match_pool || 0)),
    jackpotRolloverAmount: parseFloat(String(row.jackpot_rollover_amount || 0)),
    rolledOverToNext: parseFloat(String(row.rolled_over_to_next || 0)),
    simulationData: (row.simulation_data as Record<string, unknown>) || null,
    entryCount: row.entry_count !== undefined ? parseInt(String(row.entry_count), 10) : undefined,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? String(row.created_at),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? String(row.updated_at),
  };
}

/**
 * Creates a new monthly draw configuration.
 */
export async function createDraw(data: ValidatedDrawInput): Promise<DrawRecord> {
  // Check for duplicate active draw in same month
  const duplicate = await pool.query(
    `SELECT id FROM public.draws
      WHERE scheduled_month = $1 AND status != 'cancelled'`,
    [data.scheduledMonth]
  );

  if (duplicate.rows.length > 0) {
    throw new DrawServiceError(
      'DRAW_MONTH_EXISTS',
      `An active or scheduled draw already exists for ${data.scheduledMonth}.`,
      409
    );
  }

  // Retrieve pending jackpot rollover from the most recently completed draw
  let carriedRollover = 0.0;
  const rolloverRes = await pool.query(
    `SELECT rolled_over_to_next FROM public.draws
      WHERE status = 'completed' AND rolled_over_to_next > 0
      ORDER BY draw_date DESC
      LIMIT 1`
  );
  if (rolloverRes.rows.length > 0) {
    carriedRollover = parseFloat(String(rolloverRes.rows[0].rolled_over_to_next || 0));
  }

  const result = await pool.query(
    `INSERT INTO public.draws (
        name, description, charity_id, draw_type, scheduled_month,
        draw_date, entry_deadline, status,
        three_match_percentage, four_match_percentage, five_match_percentage,
        jackpot_rollover_amount, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      data.name,
      data.description || null,
      data.charityId || null,
      data.drawType,
      data.scheduledMonth,
      data.drawDate,
      data.entryDeadline,
      data.threeMatchPercentage,
      data.fourMatchPercentage,
      data.fiveMatchPercentage,
      carriedRollover,
    ]
  );

  return mapDrawRow(result.rows[0]);
}

/**
 * Lists all draws for Admin dashboard.
 */
export async function getAllDrawsAdmin(): Promise<DrawRecord[]> {
  const result = await pool.query(
    `SELECT d.*, COUNT(e.id)::int AS entry_count
       FROM public.draws d
  LEFT JOIN public.draw_entries e ON d.id = e.draw_id
      GROUP BY d.id
      ORDER BY d.draw_date DESC`
  );

  return result.rows.map(mapDrawRow);
}

/**
 * Gets a single draw by ID for Admin.
 */
export async function getDrawByIdAdmin(id: string): Promise<DrawRecord> {
  const result = await pool.query(
    `SELECT d.*, COUNT(e.id)::int AS entry_count
       FROM public.draws d
  LEFT JOIN public.draw_entries e ON d.id = e.draw_id
      WHERE d.id = $1
      GROUP BY d.id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new DrawServiceError('DRAW_NOT_FOUND', 'Draw not found.', 404);
  }

  return mapDrawRow(result.rows[0]);
}

/**
 * Updates a draft/scheduled draw's configuration.
 */
export async function updateDraw(
  id: string,
  data: Partial<ValidatedDrawInput>
): Promise<DrawRecord> {
  const current = await getDrawByIdAdmin(id);

  if (current.status === 'completed' || current.status === 'cancelled') {
    throw new DrawServiceError(
      'DRAW_IMMUTABLE',
      `Cannot modify a draw in status '${current.status}'.`,
      400
    );
  }

  const updates: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id];

  if (data.name !== undefined) {
    params.push(data.name);
    updates.push(`name = $${params.length}`);
  }
  if (data.description !== undefined) {
    params.push(data.description || null);
    updates.push(`description = $${params.length}`);
  }
  if (data.drawType !== undefined) {
    params.push(data.drawType);
    updates.push(`draw_type = $${params.length}`);
  }
  if (data.drawDate !== undefined) {
    params.push(data.drawDate);
    updates.push(`draw_date = $${params.length}`);
  }
  if (data.entryDeadline !== undefined) {
    params.push(data.entryDeadline);
    updates.push(`entry_deadline = $${params.length}`);
  }
  if (
    data.threeMatchPercentage !== undefined &&
    data.fourMatchPercentage !== undefined &&
    data.fiveMatchPercentage !== undefined
  ) {
    params.push(data.threeMatchPercentage, data.fourMatchPercentage, data.fiveMatchPercentage);
    updates.push(
      `three_match_percentage = $${params.length - 2}, four_match_percentage = $${params.length - 1}, five_match_percentage = $${params.length}`
    );
  }

  const result = await pool.query(
    `UPDATE public.draws
        SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *`,
    params
  );

  return mapDrawRow(result.rows[0]);
}

/**
 * Deletes a draw (only allowed in draft/scheduled status before entries are submitted).
 */
export async function deleteDraw(id: string): Promise<void> {
  const current = await getDrawByIdAdmin(id);

  if (current.status !== 'draft' && current.status !== 'scheduled') {
    throw new DrawServiceError(
      'CANNOT_DELETE_ACTIVE_DRAW',
      `Only draft or scheduled draws can be deleted. Current status is '${current.status}'.`,
      400
    );
  }

  await pool.query('DELETE FROM public.draw_entries WHERE draw_id = $1', [id]);
  await pool.query('DELETE FROM public.draws WHERE id = $1', [id]);
}

/**
 * Opens a draw:
 * 1. Validates status is draft or scheduled
 * 2. Enrolls all active subscribers automatically
 * 3. Generates 5 unique numbers per subscriber (Random or Score-Weighted)
 * 4. Idempotently persists entries
 * 5. Updates status = 'open' and calculates initial prize pool
 */
export async function openDraw(drawId: string): Promise<{ draw: DrawRecord; enrolledCount: number }> {
  const draw = await getDrawByIdAdmin(drawId);

  if (draw.status !== 'draft' && draw.status !== 'scheduled') {
    if (draw.status === 'open') {
      // Already open; return idempotently
      return { draw, enrolledCount: draw.entryCount || 0 };
    }
    throw new DrawServiceError(
      'INVALID_STATUS_TRANSITION',
      `Cannot open draw from current status '${draw.status}'.`,
      400
    );
  }

  // 1. Fetch all eligible subscribers with active subscription status and unexpired period
  const subsRes = await pool.query(
    `SELECT DISTINCT ON (s.user_id)
            s.user_id, s.plan, COALESCE(s.contribution_percentage, 10) AS contribution_percentage
       FROM public.subscriptions s
      WHERE s.status = 'active' AND s.expires_at > NOW()
      ORDER BY s.user_id, s.created_at DESC`
  );

  const eligibleSubscribers = subsRes.rows;

  // 2. Fetch recent scores if score-weighted
  let scoresByUser = new Map<string, number[]>();
  if (draw.drawType === 'SCORE_WEIGHTED' && eligibleSubscribers.length > 0) {
    const userIds = eligibleSubscribers.map((s) => s.user_id);
    const scoreRes = await pool.query(
      `SELECT user_id, score
         FROM public.scores
        WHERE user_id = ANY($1::uuid[])
        ORDER BY score_date DESC, created_at DESC`,
      [userIds]
    );

    for (const row of scoreRes.rows) {
      const uId = row.user_id;
      const currentScores = scoresByUser.get(uId) || [];
      if (currentScores.length < 5) {
        currentScores.push(row.score);
        scoresByUser.set(uId, currentScores);
      }
    }
  }

  // 3. Generate tickets for subscribers
  const entriesToInsert: { userId: string; numbers: number[] }[] = [];
  for (const sub of eligibleSubscribers) {
    let numbers: number[];
    if (draw.drawType === 'SCORE_WEIGHTED') {
      const retainedScores = scoresByUser.get(sub.user_id) || [];
      numbers = generateScoreWeightedNumbers(retainedScores);
    } else {
      numbers = generateRandomNumbers();
    }
    entriesToInsert.push({ userId: sub.user_id, numbers });
  }

  // 4. Batch insert entries with ON CONFLICT (user_id, draw_id) DO NOTHING
  for (const entry of entriesToInsert) {
    await pool.query(
      `INSERT INTO public.draw_entries (draw_id, user_id, numbers, created_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id, draw_id) DO NOTHING`,
      [drawId, entry.userId, JSON.stringify(entry.numbers)]
    );
  }

  // 5. Calculate prize pool from eligible subscribers
  const poolCalc = calculatePrizePool(
    eligibleSubscribers.map((s) => ({
      plan: s.plan,
      contributionPercentage: Number(s.contribution_percentage),
    })),
    draw.jackpotRolloverAmount,
    {
      threeMatch: draw.threeMatchPercentage,
      fourMatch: draw.fourMatchPercentage,
      fiveMatch: draw.fiveMatchPercentage,
    }
  );

  // 6. Transition draw to 'open'
  const updateRes = await pool.query(
    `UPDATE public.draws
        SET status              = 'open',
            prize_amount        = $1,
            three_match_pool    = $2,
            four_match_pool     = $3,
            five_match_pool     = $4,
            updated_at          = NOW()
      WHERE id = $5
      RETURNING *`,
    [
      poolCalc.totalPool,
      poolCalc.threeMatchPool,
      poolCalc.fourMatchPool,
      poolCalc.fiveMatchPool,
      drawId,
    ]
  );

  const updatedDraw = mapDrawRow(updateRes.rows[0]);
  updatedDraw.entryCount = entriesToInsert.length;

  return { draw: updatedDraw, enrolledCount: entriesToInsert.length };
}

/**
 * Closes a draw: locks entries before simulation.
 */
export async function closeDraw(drawId: string): Promise<DrawRecord> {
  const draw = await getDrawByIdAdmin(drawId);

  if (draw.status !== 'open') {
    throw new DrawServiceError(
      'INVALID_STATUS_TRANSITION',
      `Cannot close draw. Current status is '${draw.status}'.`,
      400
    );
  }

  const result = await pool.query(
    `UPDATE public.draws
        SET status = 'closed', updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [drawId]
  );

  return mapDrawRow(result.rows[0]);
}

/**
 * Simulates a draw:
 * 1. Generates 5 candidate winning numbers
 * 2. Evaluates all ticket matches
 * 3. Calculates prize pools and per-winner splits
 * 4. Determines jackpot rollover amount
 * 5. Saves snapshot in simulation_data and sets status = 'simulated'
 * Crucially: DOES NOT touch public.winners
 */
export async function simulateDraw(
  drawId: string,
  forceNumbers?: number[]
): Promise<{ draw: DrawRecord; simulation: Record<string, unknown> }> {
  const draw = await getDrawByIdAdmin(drawId);

  if (draw.status !== 'closed' && draw.status !== 'simulated' && draw.status !== 'open') {
    throw new DrawServiceError(
      'INVALID_STATUS_TRANSITION',
      `Cannot simulate draw in status '${draw.status}'. Draw must be open or closed.`,
      400
    );
  }

  // 1. Fetch all entries
  const entriesRes = await pool.query(
    `SELECT id, user_id, numbers FROM public.draw_entries WHERE draw_id = $1`,
    [drawId]
  );

  const entries = entriesRes.rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    numbers: (r.numbers as number[]) || [],
  }));

  if (entries.length === 0) {
    throw new DrawServiceError(
      'NO_ENTRIES',
      'Cannot simulate a draw with zero entries. Open draw to enroll subscribers.',
      400
    );
  }

  // 2. Fetch subscriber plans and charity preferences for active entries
  const subsRes = await pool.query(
    `SELECT s.plan, COALESCE(s.contribution_percentage, 10) AS contribution_percentage
       FROM public.subscriptions s
       JOIN public.draw_entries e ON s.user_id = e.user_id
      WHERE e.draw_id = $1`,
    [drawId]
  );

  const poolCalc = calculatePrizePool(
    subsRes.rows.map((r) => ({
      plan: r.plan,
      contributionPercentage: Number(r.contribution_percentage),
    })),
    draw.jackpotRolloverAmount,
    {
      threeMatch: draw.threeMatchPercentage,
      fourMatch: draw.fourMatchPercentage,
      fiveMatch: draw.fiveMatchPercentage,
    }
  );

  // 3. Generate candidate winning numbers (or use forced numbers for deterministic testing)
  const drawnNumbers = forceNumbers && forceNumbers.length === 5 ? forceNumbers.sort((a, b) => a - b) : generateRandomNumbers();

  // 4. Evaluate matches
  const matchResult = evaluateMatches(entries, drawnNumbers, {
    threeMatchPool: poolCalc.threeMatchPool,
    fourMatchPool: poolCalc.fourMatchPool,
    fiveMatchPool: poolCalc.fiveMatchPool,
  });

  // Fetch user names for winner preview
  const winnerUserIds = matchResult.allWinners.map((w) => w.userId);
  let userMap = new Map<string, { name: string; email: string }>();
  if (winnerUserIds.length > 0) {
    const usersRes = await pool.query(
      `SELECT id, name, email FROM public.users WHERE id = ANY($1::uuid[])`,
      [winnerUserIds]
    );
    for (const u of usersRes.rows) {
      userMap.set(u.id, { name: u.name, email: u.email });
    }
  }

  const enrichedWinners = matchResult.allWinners.map((w) => ({
    ...w,
    userName: userMap.get(w.userId)?.name || 'Unknown User',
    userEmail: userMap.get(w.userId)?.email || '',
  }));

  // 5. Construct simulation snapshot
  const simulationSnapshot = {
    drawnNumbers,
    simulatedAt: new Date().toISOString(),
    entryCount: entries.length,
    totalPool: poolCalc.totalPool,
    threeMatchPool: poolCalc.threeMatchPool,
    fourMatchPool: poolCalc.fourMatchPool,
    fiveMatchPool: poolCalc.fiveMatchPool,
    carriedRollover: draw.jackpotRolloverAmount,
    rolloverToNext: matchResult.rolloverToNext,
    threeMatchWinnersCount: matchResult.threeMatchWinners.length,
    fourMatchWinnersCount: matchResult.fourMatchWinners.length,
    fiveMatchWinnersCount: matchResult.fiveMatchWinners.length,
    threeMatchPerWinner: matchResult.threeMatchWinners[0]?.prizeAmount || 0,
    fourMatchPerWinner: matchResult.fourMatchWinners[0]?.prizeAmount || 0,
    fiveMatchPerWinner: matchResult.fiveMatchWinners[0]?.prizeAmount || 0,
    winners: enrichedWinners,
  };

  // 6. Persist simulation snapshot and set status to 'simulated'
  const updateRes = await pool.query(
    `UPDATE public.draws
        SET status              = 'simulated',
            prize_amount        = $1,
            three_match_pool    = $2,
            four_match_pool     = $3,
            five_match_pool     = $4,
            simulation_data     = $5::jsonb,
            updated_at          = NOW()
      WHERE id = $6
      RETURNING *`,
    [
      poolCalc.totalPool,
      poolCalc.threeMatchPool,
      poolCalc.fourMatchPool,
      poolCalc.fiveMatchPool,
      JSON.stringify(simulationSnapshot),
      drawId,
    ]
  );

  const updatedDraw = mapDrawRow(updateRes.rows[0]);
  updatedDraw.entryCount = entries.length;

  return { draw: updatedDraw, simulation: simulationSnapshot };
}

/**
 * Publishes a draw:
 * 1. Validates draw is in 'simulated' status
 * 2. Checks staleness: entry count must match simulation snapshot
 * 3. Atomically executes publication:
 *    - Inserts winners into public.winners with unique sequential ranks
 *    - Updates draw to 'completed' with finalized numbers, pools, and rollover
 *    - Applies rollover to next active draw if present
 * 4. Idempotency: cannot republish a completed draw
 */
export async function publishDraw(
  drawId: string
): Promise<{ draw: DrawRecord; winners: WinnerRecord[] }> {
  const draw = await getDrawByIdAdmin(drawId);

  if (draw.status === 'completed') {
    throw new DrawServiceError(
      'DRAW_ALREADY_PUBLISHED',
      'This draw has already been published and completed.',
      409
    );
  }

  if (draw.status !== 'simulated' || !draw.simulationData) {
    throw new DrawServiceError(
      'DRAW_NOT_SIMULATED',
      'Draw must be simulated and reviewed before publishing.',
      400
    );
  }

  const simData = draw.simulationData as {
    drawnNumbers: number[];
    entryCount: number;
    totalPool: number;
    threeMatchPool: number;
    fourMatchPool: number;
    fiveMatchPool: number;
    rolloverToNext: number;
    winners: EvaluatedWinner[];
  };

  // Staleness check: verify entry count hasn't changed
  const currentCountRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM public.draw_entries WHERE draw_id = $1`,
    [drawId]
  );
  const currentCount = currentCountRes.rows[0]?.cnt || 0;

  if (currentCount !== simData.entryCount) {
    throw new DrawServiceError(
      'STALE_SIMULATION',
      `Simulation is stale: entry count changed from ${simData.entryCount} to ${currentCount}. Please re-simulate.`,
      409
    );
  }

  // Execute publication in an atomic transaction
  const client = await pool.connect();
  const createdWinners: WinnerRecord[] = [];

  try {
    await client.query('BEGIN');

    // 1. Insert winners into public.winners
    for (const w of simData.winners) {
      const winRes = await client.query(
        `INSERT INTO public.winners (
            draw_id, user_id, draw_entry_id, rank, match_count, prize_amount, currency, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'INR', NOW())
         RETURNING *`,
        [drawId, w.userId, w.drawEntryId, w.rank, w.matchCount, w.prizeAmount]
      );
      createdWinners.push({
        id: winRes.rows[0].id,
        drawId,
        userId: w.userId,
        drawEntryId: w.drawEntryId,
        rank: w.rank || 1,
        matchCount: w.matchCount,
        prizeAmount: parseFloat(String(w.prizeAmount)),
        currency: 'INR',
        createdAt: winRes.rows[0].created_at,
      });
    }

    // 2. Update draw to 'completed'
    const drawUpdateRes = await client.query(
      `UPDATE public.draws
          SET status                = 'completed',
              drawn_numbers         = $1::jsonb,
              prize_amount          = $2,
              three_match_pool      = $3,
              four_match_pool       = $4,
              five_match_pool       = $5,
              rolled_over_to_next   = $6,
              updated_at            = NOW()
        WHERE id = $7
        RETURNING *`,
      [
        JSON.stringify(simData.drawnNumbers),
        simData.totalPool,
        simData.threeMatchPool,
        simData.fourMatchPool,
        simData.fiveMatchPool,
        simData.rolloverToNext,
        drawId,
      ]
    );

    // 3. If there is rollover, automatically apply to the next active/scheduled draw
    if (simData.rolloverToNext > 0) {
      await client.query(
        `UPDATE public.draws
            SET jackpot_rollover_amount = $1,
                updated_at              = NOW()
          WHERE id = (
            SELECT id FROM public.draws
             WHERE status IN ('draft', 'scheduled', 'open') AND id != $2
             ORDER BY draw_date ASC
             LIMIT 1
          )`,
        [simData.rolloverToNext, drawId]
      );
    }

    await client.query('COMMIT');

    const publishedDraw = mapDrawRow(drawUpdateRes.rows[0]);
    publishedDraw.entryCount = currentCount;

    return { draw: publishedDraw, winners: createdWinners };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Public draw listing: returns active and completed draws.
 */
export async function getPublicDraws(): Promise<DrawRecord[]> {
  const result = await pool.query(
    `SELECT d.*, COUNT(e.id)::int AS entry_count
       FROM public.draws d
  LEFT JOIN public.draw_entries e ON d.id = e.draw_id
      WHERE d.status IN ('open', 'completed')
      GROUP BY d.id
      ORDER BY d.draw_date DESC`
  );

  return result.rows.map(mapDrawRow);
}

/**
 * Public draw details: includes winners for completed draws.
 */
export async function getPublicDrawById(
  id: string
): Promise<{ draw: DrawRecord; winners: WinnerRecord[] }> {
  const drawRes = await pool.query(
    `SELECT d.*, COUNT(e.id)::int AS entry_count
       FROM public.draws d
  LEFT JOIN public.draw_entries e ON d.id = e.draw_id
      WHERE d.id = $1 AND d.status IN ('open', 'completed')
      GROUP BY d.id`,
    [id]
  );

  if (drawRes.rows.length === 0) {
    throw new DrawServiceError('DRAW_NOT_FOUND', 'Draw not found or not published.', 404);
  }

  const draw = mapDrawRow(drawRes.rows[0]);

  let winners: WinnerRecord[] = [];
  if (draw.status === 'completed') {
    const winRes = await pool.query(
      `SELECT w.*, u.name AS user_name, u.email AS user_email
         FROM public.winners w
         JOIN public.users u ON w.user_id = u.id
        WHERE w.draw_id = $1
        ORDER BY w.rank ASC`,
      [id]
    );

    winners = winRes.rows.map((r) => ({
      id: r.id as string,
      drawId: r.draw_id as string,
      userId: r.user_id as string,
      userName: r.user_name as string,
      userEmail: r.user_email as string,
      drawEntryId: r.draw_entry_id as string,
      rank: parseInt(String(r.rank), 10),
      matchCount: parseInt(String(r.match_count), 10) as 3 | 4 | 5,
      prizeAmount: parseFloat(String(r.prize_amount)),
      currency: r.currency as string,
      createdAt: (r.created_at as Date)?.toISOString?.() ?? String(r.created_at),
    }));
  }

  return { draw, winners };
}

/**
 * Gets a subscriber's entry ticket for a specific draw.
 */
export async function getSubscriberDrawEntry(
  drawId: string,
  userId: string
): Promise<DrawEntryRecord | null> {
  const result = await pool.query(
    `SELECT * FROM public.draw_entries WHERE draw_id = $1 AND user_id = $2`,
    [drawId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    drawId: row.draw_id,
    userId: row.user_id,
    scoreId: row.score_id,
    numbers: (row.numbers as number[]) || [],
    createdAt: (row.created_at as Date)?.toISOString?.() ?? String(row.created_at),
  };
}
