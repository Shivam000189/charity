import { pool } from '../config/database';
import { validateScoreInput } from '../utils/score.validation';

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  scoresCount: number;
  winningsCount: number;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscription: {
    id: string;
    plan: string;
    status: string;
    startsAt: string;
    expiresAt: string;
    charityName: string | null;
    contributionPercentage: number;
  } | null;
  recentScores: {
    id: string;
    score: number;
    scoreDate: string;
    createdAt: string;
  }[];
  winnings: {
    id: string;
    drawTitle: string;
    rank: number;
    matchCount: number;
    prizeAmount: number;
    verificationStatus: string;
    paymentStatus: string;
  }[];
}

/**
 * Lists all registered users for admin directory table
 */
export async function listUsersAdmin(): Promise<AdminUserListItem[]> {
  const res = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            s.plan AS sub_plan, s.status AS sub_status,
            (SELECT COUNT(*)::int FROM public.scores sc WHERE sc.user_id = u.id) AS scores_count,
            (SELECT COUNT(*)::int FROM public.winners w WHERE w.user_id = u.id) AS winnings_count
       FROM public.users u
  LEFT JOIN public.subscriptions s ON u.id = s.user_id AND s.status = 'active'
      ORDER BY u.created_at DESC`
  );

  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    subscriptionPlan: r.sub_plan || null,
    subscriptionStatus: r.sub_status || null,
    scoresCount: Number(r.scores_count),
    winningsCount: Number(r.winnings_count),
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

/**
 * Returns comprehensive user detail for admin drawer/modal
 */
export async function getUserDetailAdmin(userId: string): Promise<AdminUserDetail> {
  const userRes = await pool.query(
    `SELECT id, name, email, role, created_at FROM public.users WHERE id = $1`,
    [userId]
  );

  if (userRes.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userRes.rows[0];

  // Subscription
  const subRes = await pool.query(
    `SELECT s.id, s.plan, s.status, s.started_at, s.expires_at, s.contribution_percentage,
            c.name AS charity_name
       FROM public.subscriptions s
  LEFT JOIN public.charities c ON s.charity_id = c.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1`,
    [userId]
  );

  const sub = subRes.rows.length > 0 ? {
    id: subRes.rows[0].id,
    plan: subRes.rows[0].plan,
    status: subRes.rows[0].status,
    startsAt: new Date(subRes.rows[0].started_at).toISOString(),
    expiresAt: new Date(subRes.rows[0].expires_at).toISOString(),
    charityName: subRes.rows[0].charity_name || null,
    contributionPercentage: Number(subRes.rows[0].contribution_percentage || 10),
  } : null;

  // Recent scores
  const scoresRes = await pool.query(
    `SELECT id, score, score_date, created_at
       FROM public.scores
      WHERE user_id = $1
      ORDER BY score_date DESC, created_at DESC
      LIMIT 5`,
    [userId]
  );

  const scores = scoresRes.rows.map((r) => ({
    id: r.id,
    score: Number(r.score),
    scoreDate: r.score_date,
    createdAt: new Date(r.created_at).toISOString(),
  }));

  // Winnings
  const winningsRes = await pool.query(
    `SELECT w.id, w.rank, w.match_count, w.prize_amount, w.verification_status, w.payment_status,
            d.name AS draw_title
       FROM public.winners w
       JOIN public.draws d ON w.draw_id = d.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC`,
    [userId]
  );

  const winnings = winningsRes.rows.map((r) => ({
    id: r.id,
    drawTitle: r.draw_title,
    rank: Number(r.rank),
    matchCount: Number(r.match_count),
    prizeAmount: parseFloat(String(r.prize_amount)),
    verificationStatus: r.verification_status,
    paymentStatus: r.payment_status,
  }));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: new Date(user.created_at).toISOString(),
    subscription: sub,
    recentScores: scores,
    winnings,
  };
}

/**
 * Admin: Update user platform role
 */
export async function updateUserRoleAdmin(userId: string, newRole: string): Promise<{ id: string; role: string }> {
  if (!['visitor', 'subscriber', 'admin'].includes(newRole)) {
    throw new Error(`Invalid role '${newRole}'. Allowed roles: visitor, subscriber, admin.`);
  }

  const res = await pool.query(
    `UPDATE public.users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, role`,
    [newRole, userId]
  );

  if (res.rows.length === 0) {
    throw new Error('User not found');
  }

  return { id: res.rows[0].id, role: res.rows[0].role };
}

/**
 * Admin: Correct a score while obeying validation and uniqueness
 */
export async function adminEditScore(
  scoreId: string,
  rawScore: unknown,
  rawDate: unknown
): Promise<{ id: string; score: number; scoreDate: string }> {
  const validation = validateScoreInput({ score: rawScore, date: rawDate });
  if (!validation.valid) {
    throw new Error(validation.error.message);
  }

  const { score, date: scoreDate } = validation.data;

  // Check existing score
  const existing = await pool.query(`SELECT id, user_id FROM public.scores WHERE id = $1`, [scoreId]);
  if (existing.rows.length === 0) {
    throw new Error('Score not found');
  }

  const userId = existing.rows[0].user_id;

  // Collision check
  const collision = await pool.query(
    `SELECT id FROM public.scores WHERE user_id = $1 AND score_date = $2 AND id != $3`,
    [userId, scoreDate, scoreId]
  );

  if (collision.rows.length > 0) {
    throw new Error('A score already exists for this user on that date.');
  }

  const res = await pool.query(
    `UPDATE public.scores
        SET score = $1, score_date = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, score, score_date`,
    [score, scoreDate, scoreId]
  );

  return {
    id: res.rows[0].id,
    score: Number(res.rows[0].score),
    scoreDate: res.rows[0].score_date,
  };
}
