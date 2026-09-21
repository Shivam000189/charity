/**
 * SubscriptionService — business logic for creating, updating, and querying subscriptions.
 *
 * This service is payment-provider-agnostic.
 * Both MockPaymentProvider and StripePaymentProvider (future) call this service
 * after a successful payment to record the subscription in public.subscriptions.
 *
 * Architecture:
 *   MockPaymentProvider  ──┐
 *                          ├──► SubscriptionService ──► public.subscriptions
 *   StripeWebhook (future) ─┘
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import type { DbPlan } from '../providers/payment/plan-pricing';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DbSubscriptionStatus =
  | 'pending'
  | 'active'
  | 'pending_renewal'
  | 'cancelled'
  | 'lapsed'
  | 'expired';

export const SUBSCRIPTION_RENEWAL_WINDOW_DAYS = 7;

export interface CreateSubscriptionParams {
  userId: string;
  /** DB column value: 'monthly' | 'annual' (NOT 'yearly') */
  dbPlan: DbPlan;
  status: DbSubscriptionStatus;
  startedAt: Date;
  /** Must be after startedAt — enforced by DB constraint chk_subscriptions_expires_after_started */
  expiresAt: Date;
  cancelledAt?: Date | null;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  plan: string;
  status: DbSubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): SubscriptionRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    plan: row.plan as string,
    status: row.status as DbSubscriptionStatus,
    startedAt: row.started_at as Date,
    expiresAt: row.expires_at as Date,
    cancelledAt: (row.cancelled_at as Date) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

type DbClient = PoolClient | Pool;

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Creates or updates a subscription record in public.subscriptions.
 *
 * Respects the unique active subscription constraint:
 *   idx_subscriptions_user_active ON public.subscriptions (user_id) WHERE (status = 'active')
 *
 * Strategy for status = 'active':
 *   1. If user has an existing active or pending_renewal row → UPDATE it (plan change / renewal)
 *   2. Else if user has any row (pending/cancelled/lapsed/expired) → UPDATE most recent
 *   3. Else → INSERT new row
 *
 * Strategy for non-active status:
 *   1. If user has an active or pending_renewal row → UPDATE it to the new status
 *   2. Else if user has any row → UPDATE most recent
 *   3. Else → INSERT
 */
export async function createOrUpdateSubscription(
  params: CreateSubscriptionParams,
  dbClient: DbClient = pool
): Promise<SubscriptionRecord> {
  // Safety: ensure expires_at > started_at (DB constraint)
  if (params.expiresAt <= params.startedAt) {
    throw new Error('expiresAt must be after startedAt (DB constraint chk_subscriptions_expires_after_started)');
  }

  const { userId, dbPlan, status, startedAt, expiresAt, cancelledAt } = params;

  // Check for existing active or pending_renewal subscription
  const existingActiveOrRenewal = await dbClient.query(
    'SELECT id FROM public.subscriptions WHERE user_id = $1 AND status IN (\'active\', \'pending_renewal\') LIMIT 1',
    [userId]
  );

  if (status === 'active') {
    if (existingActiveOrRenewal.rows.length > 0) {
      // UPDATE existing active/pending_renewal subscription
      const result = await dbClient.query(
        `UPDATE public.subscriptions
           SET plan        = $1,
               status      = $2,
               started_at  = $3,
               expires_at  = $4,
               cancelled_at = NULL,
               updated_at  = NOW()
         WHERE id = $5
         RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
        [dbPlan, status, startedAt, expiresAt, existingActiveOrRenewal.rows[0].id]
      );
      return mapRow(result.rows[0]);
    }

    // No active subscription — check for any existing row
    const existingAny = await dbClient.query(
      `SELECT id FROM public.subscriptions
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1`,
      [userId]
    );

    if (existingAny.rows.length > 0) {
      // UPDATE most recent non-active row to active
      const result = await dbClient.query(
        `UPDATE public.subscriptions
           SET plan        = $1,
               status      = $2,
               started_at  = $3,
               expires_at  = $4,
               cancelled_at = NULL,
               updated_at  = NOW()
         WHERE id = $5
         RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
        [dbPlan, status, startedAt, expiresAt, existingAny.rows[0].id]
      );
      return mapRow(result.rows[0]);
    }

    // Fresh insert
    const result = await dbClient.query(
      `INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
      [userId, dbPlan, status, startedAt, expiresAt]
    );
    return mapRow(result.rows[0]);

  } else {
    // Non-active status update
    if (existingActiveOrRenewal.rows.length > 0) {
      const result = await dbClient.query(
        `UPDATE public.subscriptions
           SET status       = $1,
               cancelled_at = COALESCE($2, NOW()),
               updated_at   = NOW()
         WHERE id = $3
         RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
        [status, cancelledAt ?? null, existingActiveOrRenewal.rows[0].id]
      );
      return mapRow(result.rows[0]);
    }

    const existingAny = await dbClient.query(
      `SELECT id FROM public.subscriptions
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1`,
      [userId]
    );

    if (existingAny.rows.length > 0) {
      const result = await dbClient.query(
        `UPDATE public.subscriptions
           SET status       = $1,
               cancelled_at = COALESCE($2, NOW()),
               updated_at   = NOW()
         WHERE id = $3
         RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
        [status, cancelledAt ?? null, existingAny.rows[0].id]
      );
      return mapRow(result.rows[0]);
    }

    // Edge case: no existing row, insert as non-active
    const result = await dbClient.query(
      `INSERT INTO public.subscriptions
           (user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
      [userId, dbPlan, status, startedAt, expiresAt, cancelledAt ?? new Date()]
    );
    return mapRow(result.rows[0]);
  }
}

/**
 * Returns the user's current active subscription record, or null if none exists.
 */
export async function getActiveSubscription(userId: string): Promise<SubscriptionRecord | null> {
  const result = await pool.query(
    `SELECT id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at
       FROM public.subscriptions
      WHERE user_id = $1 AND status IN ('active', 'pending_renewal')
      ORDER BY updated_at DESC
      LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}

/**
 * Returns the user's most recent subscription record of any status, or null if never subscribed.
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionRecord | null> {
  const result = await pool.query(
    `SELECT id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at
       FROM public.subscriptions
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}

/**
 * Checks whether the user currently has active subscriber access.
 *
 * Requirements for active access:
 * 1. An existing subscription record exists in public.subscriptions
 * 2. status IN ('active', 'pending_renewal') OR (status = 'cancelled' AND expires_at > NOW())
 * 3. expires_at > NOW() (strict non-expired check)
 *
 * If status is lapsed, expired, or pending -> returns false.
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (!sub) return false;

  const now = new Date();
  const isNotExpired = new Date(sub.expiresAt) > now;

  if (!isNotExpired) {
    return false;
  }

  // Active or pending_renewal within validity window grants access
  if (sub.status === 'active' || sub.status === 'pending_renewal') {
    return true;
  }

  // Cancelled subscriptions retain access until end-of-period
  if (sub.status === 'cancelled' && isNotExpired) {
    return true;
  }

  return false;
}

/**
 * Cancels an active or pending_renewal subscription.
 *
 * Sets status = 'cancelled' and cancelled_at = NOW().
 * Preserves expires_at so access remains valid until end-of-period.
 * Throws if no active subscription exists or if already cancelled/lapsed.
 */
export async function cancelSubscription(userId: string): Promise<SubscriptionRecord> {
  const sub = await getUserSubscription(userId);
  if (!sub) {
    throw new Error('No subscription found for user.');
  }

  if (sub.status === 'cancelled') {
    throw new Error('Subscription is already cancelled.');
  }

  if (sub.status === 'lapsed' || sub.status === 'expired') {
    throw new Error('Cannot cancel a lapsed or expired subscription.');
  }

  const result = await pool.query(
    `UPDATE public.subscriptions
        SET status       = 'cancelled',
            cancelled_at = NOW(),
            updated_at   = NOW()
      WHERE id = $1
      RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
    [sub.id]
  );

  return mapRow(result.rows[0]);
}

/**
 * Reactivates a cancelled subscription before its expires_at has passed.
 *
 * Transitions status: 'cancelled' -> 'active'.
 * Clears cancelled_at.
 * Throws if subscription is already active, not cancelled, or has already lapsed.
 */
export async function reactivateSubscription(userId: string): Promise<SubscriptionRecord> {
  const sub = await getUserSubscription(userId);
  if (!sub) {
    throw new Error('No subscription found for user.');
  }

  if (sub.status === 'active' || sub.status === 'pending_renewal') {
    throw new Error('Subscription is already active.');
  }

  if (sub.status !== 'cancelled') {
    throw new Error(`Cannot reactivate subscription with status "${sub.status}".`);
  }

  const now = new Date();
  if (new Date(sub.expiresAt) <= now) {
    throw new Error('Subscription has already expired and cannot be reactivated. Please start a new subscription.');
  }

  const result = await pool.query(
    `UPDATE public.subscriptions
        SET status       = 'active',
            cancelled_at = NULL,
            updated_at   = NOW()
      WHERE id = $1
      RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
    [sub.id]
  );

  return mapRow(result.rows[0]);
}

/**
 * Renews an existing subscription by extending expires_at and ensuring status is 'active'.
 *
 * If plan is supplied, updates the plan.
 * Calculates new expires_at based on current expires_at (or NOW() if already in the past).
 */
export async function renewSubscription(
  userId: string,
  plan?: 'monthly' | 'yearly'
): Promise<SubscriptionRecord> {
  const sub = await getUserSubscription(userId);
  if (!sub) {
    throw new Error('No subscription found to renew.');
  }

  const targetPlan = plan ?? (sub.plan === 'annual' ? 'yearly' : 'monthly');
  const dbPlan: DbPlan = targetPlan === 'yearly' ? 'annual' : 'monthly';

  // Base date for extension: if current expiresAt is in future, extend from expiresAt; otherwise extend from NOW()
  const now = new Date();
  const currentExpiry = new Date(sub.expiresAt);
  const baseDate = currentExpiry > now ? currentExpiry : now;

  const newExpiresAt = new Date(baseDate);
  if (dbPlan === 'monthly') {
    newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
  } else {
    newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
  }

  const result = await pool.query(
    `UPDATE public.subscriptions
        SET plan        = $1,
            status      = 'active',
            expires_at  = $2,
            cancelled_at = NULL,
            updated_at  = NOW()
      WHERE id = $3
      RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
    [dbPlan, newExpiresAt, sub.id]
  );

  return mapRow(result.rows[0]);
}

/**
 * Scans subscriptions nearing expiration (within SUBSCRIPTION_RENEWAL_WINDOW_DAYS)
 * and marks active subscriptions as 'pending_renewal'.
 */
export async function applyPendingRenewalStatus(userId?: string): Promise<number> {
  let queryText = `
    UPDATE public.subscriptions
       SET status     = 'pending_renewal',
           updated_at = NOW()
     WHERE status = 'active'
       AND expires_at > NOW()
       AND expires_at <= NOW() + ($1 || ' days')::interval
  `;
  const params: unknown[] = [SUBSCRIPTION_RENEWAL_WINDOW_DAYS];

  if (userId) {
    queryText += ` AND user_id = $2`;
    params.push(userId);
  }

  const result = await pool.query(queryText, params);
  return result.rowCount ?? 0;
}

/**
 * Bulk updates subscriptions whose expires_at has passed to 'lapsed'.
 *
 * Targets: 'active', 'pending_renewal', and 'cancelled' where expires_at <= NOW().
 * Returns the number of lapsed subscriptions updated.
 */
export async function markLapsedSubscriptions(): Promise<number> {
  const result = await pool.query(
    `UPDATE public.subscriptions
        SET status     = 'lapsed',
            updated_at = NOW()
      WHERE status IN ('active', 'pending_renewal', 'cancelled')
        AND expires_at <= NOW()`
  );

  return result.rowCount ?? 0;
}
