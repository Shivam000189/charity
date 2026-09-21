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

export type DbSubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired';

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
 *   1. If user has an existing active row → UPDATE it (plan change / renewal)
 *   2. Else if user has any row (pending/cancelled/expired) → UPDATE most recent
 *   3. Else → INSERT new row
 *
 * Strategy for non-active status (cancelled / expired / pending):
 *   1. If user has an active row → UPDATE it to the new status
 *   2. Else if user has any row → UPDATE most recent
 *   3. Else → INSERT (edge case)
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

  // Check for existing active subscription
  const existingActive = await dbClient.query(
    'SELECT id FROM public.subscriptions WHERE user_id = $1 AND status = $2',
    [userId, 'active']
  );

  if (status === 'active') {
    if (existingActive.rows.length > 0) {
      // UPDATE existing active subscription
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
        [dbPlan, status, startedAt, expiresAt, existingActive.rows[0].id]
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
    if (existingActive.rows.length > 0) {
      const result = await dbClient.query(
        `UPDATE public.subscriptions
           SET status       = $1,
               cancelled_at = COALESCE($2, NOW()),
               updated_at   = NOW()
         WHERE id = $3
         RETURNING id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at, updated_at`,
        [status, cancelledAt ?? null, existingActive.rows[0].id]
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
      WHERE user_id = $1 AND status = 'active'
      LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}
