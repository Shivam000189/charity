import Stripe from 'stripe';
import { PoolClient } from 'pg';
import { env } from '../config/env';
import { pool } from '../config/database';
import { getStripeClient, isStripeConfigured } from '../config/stripe';
import { createOrUpdateSubscription } from './subscription.service';

export type DbPlan = 'monthly' | 'annual';
export type DbSubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired';

/**
 * Maps a Stripe Price ID or fallback plan key to the database plan column ('monthly' | 'annual').
 */
export function mapStripePriceToPlan(priceId?: string, fallbackPlan?: string): DbPlan {
  if (priceId) {
    if (env.STRIPE_MONTHLY_PRICE_ID && priceId === env.STRIPE_MONTHLY_PRICE_ID) {
      return 'monthly';
    }
    if (env.STRIPE_YEARLY_PRICE_ID && priceId === env.STRIPE_YEARLY_PRICE_ID) {
      return 'annual';
    }
  }

  if (fallbackPlan) {
    const normalized = fallbackPlan.trim().toLowerCase();
    if (normalized === 'yearly' || normalized === 'annual') {
      return 'annual';
    }
    if (normalized === 'monthly') {
      return 'monthly';
    }
  }

  return 'monthly';
}

/**
 * Maps Stripe Subscription status to the database check constraint ('pending' | 'active' | 'cancelled' | 'expired').
 */
export function mapStripeStatusToDb(stripeStatus: Stripe.Subscription.Status): DbSubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'cancelled';
    case 'incomplete':
    case 'past_due':
    case 'paused':
      return 'pending';
    default:
      return 'pending';
  }
}

/**
 * Converts Stripe Unix timestamp seconds into a JavaScript Date object.
 */
export function toTimestampDate(unixSeconds?: number | null): Date | null {
  if (!unixSeconds || typeof unixSeconds !== 'number') {
    return null;
  }
  return new Date(unixSeconds * 1000);
}

/**
 * Verifies the Stripe webhook signature using raw body and configured webhook secret.
 * Strictly throws if verification fails.
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  secret?: string,
  customStripe?: Stripe
): Stripe.Event {
  const webhookSecret = secret || env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.trim() === '') {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured in server environment');
  }

  const client = customStripe || getStripeClient();
  return client.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Checks if a Stripe event has already been processed (Idempotency check).
 */
export async function isEventProcessed(
  client: PoolClient | typeof pool,
  eventId: string
): Promise<boolean> {
  const res = await client.query(
    'SELECT id FROM public.stripe_webhook_events WHERE stripe_event_id = $1 LIMIT 1',
    [eventId]
  );
  return res.rows.length > 0;
}

/**
 * Records a processed Stripe event ID into the idempotency table.
 */
export async function recordProcessedEvent(
  client: PoolClient | typeof pool,
  eventId: string,
  eventType: string
): Promise<void> {
  await client.query(
    `INSERT INTO public.stripe_webhook_events (stripe_event_id, event_type, processed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [eventId, eventType]
  );
}

/**
 * Synchronizes an active or updated subscription record into public.subscriptions.
 * Respects single active subscription constraint (idx_subscriptions_user_active).
 */
/**
 * Synchronizes a subscription record into public.subscriptions.
 * Delegates to SubscriptionService which is shared with the mock payment flow.
 *
 * This wrapper keeps the existing Stripe webhook handler call signatures unchanged
 * while the actual DB logic lives in subscription.service.ts.
 */
export async function syncSubscriptionRecord(
  client: PoolClient | typeof pool,
  params: {
    userId: string;
    plan: DbPlan;
    status: DbSubscriptionStatus;
    startedAt: Date;
    expiresAt: Date;
    cancelledAt?: Date | null;
  }
): Promise<void> {
  // Ensure expiresAt > startedAt to satisfy chk_subscriptions_expires_after_started
  let safeExpiresAt = params.expiresAt;
  if (safeExpiresAt <= params.startedAt) {
    // Fallback: use proper calendar arithmetic
    const fallback = new Date(params.startedAt);
    if (params.plan === 'annual') {
      fallback.setFullYear(fallback.getFullYear() + 1);
    } else {
      fallback.setMonth(fallback.getMonth() + 1);
    }
    safeExpiresAt = fallback;
  }

  // Delegate to SubscriptionService (shared with MockPaymentProvider)
  await createOrUpdateSubscription(
    {
      userId: params.userId,
      dbPlan: params.plan,
      status: params.status,
      startedAt: params.startedAt,
      expiresAt: safeExpiresAt,
      cancelledAt: params.cancelledAt,
    },
    client
  );
}

/**
 * Handles checkout.session.completed webhook event.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  dbClient: PoolClient | typeof pool,
  customStripe?: Stripe
): Promise<void> {
  if (session.mode !== 'subscription') {
    return;
  }

  // 1. Identify application user from metadata or fallback customer details
  let userId = session.metadata?.userId;
  const planMeta = session.metadata?.plan;

  const stripeClient = customStripe || (isStripeConfigured() ? getStripeClient() : null);

  // If userId not found on session, check Stripe subscription metadata
  if (!userId && session.subscription && stripeClient) {
    try {
      const sub = await stripeClient.subscriptions.retrieve(session.subscription as string);
      userId = sub.metadata?.userId;
    } catch (err: unknown) {
      console.warn('Could not retrieve subscription metadata for checkout session:', (err as Error).message);
    }
  }

  // If still not found, fallback to looking up public.users by customer email
  if (!userId) {
    const customerEmail = session.customer_details?.email || session.customer_email;
    if (customerEmail) {
      const userRes = await dbClient.query(
        'SELECT id FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [customerEmail]
      );
      userId = userRes.rows[0]?.id;
    }
  }

  if (!userId) {
    throw new Error(`checkout.session.completed: Unable to map application user for session ${session.id}`);
  }

  // 2. Retrieve subscription details from Stripe for authoritative billing period and price
  let plan: DbPlan = mapStripePriceToPlan(undefined, planMeta);
  let startedAt = new Date();
  let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let status: DbSubscriptionStatus = 'active';

  if (session.subscription && stripeClient) {
    try {
      const sub = await stripeClient.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items?.data?.[0]?.price?.id;
      plan = mapStripePriceToPlan(priceId, planMeta || sub.metadata?.plan);
      status = mapStripeStatusToDb(sub.status);
      
      const subStart = toTimestampDate((sub as any).current_period_start || sub.start_date);
      const subEnd = toTimestampDate((sub as any).current_period_end);

      if (subStart) startedAt = subStart;
      if (subEnd) expiresAt = subEnd;
    } catch (err: unknown) {
      console.warn('Could not retrieve detailed Stripe subscription, using session metadata fallback:', (err as Error).message);
    }
  }

  await syncSubscriptionRecord(dbClient, {
    userId,
    plan,
    status,
    startedAt,
    expiresAt,
  });
}

/**
 * Handles customer.subscription.updated webhook event.
 */
export async function handleCustomerSubscriptionUpdated(
  subscription: Stripe.Subscription,
  dbClient: PoolClient | typeof pool,
  customStripe?: Stripe
): Promise<void> {
  // 1. Identify user from subscription metadata or customer lookup
  let userId = subscription.metadata?.userId;

  if (!userId && subscription.customer) {
    const stripeClient = customStripe || (isStripeConfigured() ? getStripeClient() : null);
    if (stripeClient) {
      try {
        const customer = await stripeClient.customers.retrieve(subscription.customer as string);
        if (!customer.deleted && (customer as Stripe.Customer).email) {
          const email = (customer as Stripe.Customer).email!;
          const userRes = await dbClient.query(
            'SELECT id FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
            [email]
          );
          userId = userRes.rows[0]?.id;
        }
      } catch (err: unknown) {
        console.warn('Failed to retrieve customer for subscription update:', (err as Error).message);
      }
    }
  }

  if (!userId) {
    throw new Error(`customer.subscription.updated: Unable to map application user for subscription ${subscription.id}`);
  }

  // 2. Map Stripe subscription fields
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const plan: DbPlan = mapStripePriceToPlan(priceId, subscription.metadata?.plan);
  const status: DbSubscriptionStatus = mapStripeStatusToDb(subscription.status);

  const startedAt = toTimestampDate((subscription as any).current_period_start || subscription.start_date) || new Date();
  const expiresAt = toTimestampDate((subscription as any).current_period_end) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const cancelledAt = toTimestampDate(subscription.canceled_at);

  await syncSubscriptionRecord(dbClient, {
    userId,
    plan,
    status,
    startedAt,
    expiresAt,
    cancelledAt,
  });
}

/**
 * Handles customer.subscription.deleted webhook event.
 */
export async function handleCustomerSubscriptionDeleted(
  subscription: Stripe.Subscription,
  dbClient: PoolClient | typeof pool,
  customStripe?: Stripe
): Promise<void> {
  let userId = subscription.metadata?.userId;

  if (!userId && subscription.customer) {
    const stripeClient = customStripe || (isStripeConfigured() ? getStripeClient() : null);
    if (stripeClient) {
      try {
        const customer = await stripeClient.customers.retrieve(subscription.customer as string);
        if (!customer.deleted && (customer as Stripe.Customer).email) {
          const email = (customer as Stripe.Customer).email!;
          const userRes = await dbClient.query(
            'SELECT id FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
            [email]
          );
          userId = userRes.rows[0]?.id;
        }
      } catch (err: unknown) {
        console.warn('Failed to retrieve customer for subscription deletion:', (err as Error).message);
      }
    }
  }

  if (!userId) {
    throw new Error(`customer.subscription.deleted: Unable to map application user for subscription ${subscription.id}`);
  }

  const cancelledAt = toTimestampDate(subscription.canceled_at) || new Date();

  // Mark status as cancelled in public.subscriptions without deleting the historical row
  await syncSubscriptionRecord(dbClient, {
    userId,
    plan: mapStripePriceToPlan(subscription.items?.data?.[0]?.price?.id, subscription.metadata?.plan),
    status: 'cancelled',
    startedAt: toTimestampDate((subscription as any).current_period_start || subscription.start_date) || new Date(),
    expiresAt: toTimestampDate((subscription as any).current_period_end) || new Date(),
    cancelledAt,
  });
}

/**
 * Central event processor: handles signature verification, idempotency checking,
 * event routing, and transactional PostgreSQL state synchronization.
 */
export async function processWebhookEvent(
  event: Stripe.Event,
  customDbClient?: PoolClient | typeof pool,
  customStripe?: Stripe
): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
  const dbClient = customDbClient || (await pool.connect());
  const isDedicatedClient = customDbClient !== undefined && (customDbClient as any).release !== undefined;

  try {
    if (!customDbClient) {
      await (dbClient as PoolClient).query('BEGIN');
    }

    // 1. Idempotency Check
    const alreadyProcessed = await isEventProcessed(dbClient, event.id);
    if (alreadyProcessed) {
      if (!customDbClient) {
        await (dbClient as PoolClient).query('COMMIT');
      }
      return {
        success: true,
        message: `Event ${event.id} already processed (idempotent skipped)`,
        duplicate: true,
      };
    }

    // 2. Event Routing
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, dbClient, customStripe);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCustomerSubscriptionUpdated(subscription, dbClient, customStripe);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCustomerSubscriptionDeleted(subscription, dbClient, customStripe);
        break;
      }

      default: {
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        break;
      }
    }

    // 3. Record event in idempotency table
    await recordProcessedEvent(dbClient, event.id, event.type);

    if (!customDbClient) {
      await (dbClient as PoolClient).query('COMMIT');
    }

    return {
      success: true,
      message: `Event ${event.id} (${event.type}) processed successfully`,
    };
  } catch (error: unknown) {
    if (!customDbClient) {
      await (dbClient as PoolClient).query('ROLLBACK');
    }
    console.error(`[Stripe Webhook Error] Failed processing event ${event.id} (${event.type}):`, (error as Error).message);
    throw error;
  } finally {
    if (!customDbClient && (dbClient as any).release) {
      (dbClient as PoolClient).release();
    }
  }
}
