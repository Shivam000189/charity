import Stripe from 'stripe';
import { env } from '../config/env';
import { pool, checkDatabaseConnection } from '../config/database';
import { supabase } from '../config/supabase';
import {
  verifyWebhookSignature,
  processWebhookEvent,
  mapStripePriceToPlan,
  mapStripeStatusToDb,
} from '../services/webhook.service';

async function runStripeWebhookVerification() {
  console.log('--- STARTING PHASE 1 STEP 3 STRIPE WEBHOOK & SYNC VERIFICATION ---\n');
  let allPassed = true;

  const pass = (msg: string) => console.log(`✓ PASS: ${msg}`);
  const fail = (msg: string, err?: any) => {
    console.error(`✗ FAIL: ${msg}`, err || '');
    allPassed = false;
  };

  const testSecret = 'whsec_test_secret_for_automated_verification_123456';
  const testMonthlyPriceId = env.STRIPE_MONTHLY_PRICE_ID || 'price_test_monthly';
  const testYearlyPriceId = env.STRIPE_YEARLY_PRICE_ID || 'price_test_yearly';

  // Setup test user in database
  const testUserEmail = `webhook_user_${Date.now()}@example.com`;
  let testUserId: string;

  try {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { name: 'Webhook Test User' },
    });

    if (authErr || !authData.user) {
      throw new Error(`Failed to create test user: ${authErr?.message}`);
    }
    testUserId = authData.user.id;
    console.log(`Test user created: ${testUserId} (${testUserEmail})`);

    // ------------------------------------------------------------------------
    // SECTION 1: Signature Verification Tests
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Webhook Signature Verification ---');

    // Create a mock Stripe client for signature verification testing
    const mockStripeForSig = {
      webhooks: {
        constructEvent: (rawBody: Buffer | string, sig: string, secret: string) => {
          if (sig === 'valid_mock_signature' && secret === testSecret) {
            return JSON.parse(rawBody.toString());
          }
          throw new Error('Signature verification failed: invalid signature');
        },
      },
    } as unknown as Stripe;

    const dummyPayload = JSON.stringify({ id: 'evt_test_1', type: 'ping' });

    // Test 1: Valid signature accepted
    try {
      const event = verifyWebhookSignature(dummyPayload, 'valid_mock_signature', testSecret, mockStripeForSig);
      if (event.id === 'evt_test_1') {
        pass('Test 1 - Valid Stripe signature successfully verified and event constructed');
      } else {
        fail('Test 1 - Event construction returned unexpected object');
      }
    } catch (err: any) {
      fail('Test 1 - Valid signature threw error:', err.message);
    }

    // Test 2: Invalid signature rejected
    try {
      verifyWebhookSignature(dummyPayload, 'invalid_signature_token', testSecret, mockStripeForSig);
      fail('Test 2 - Expected invalid signature to throw error');
    } catch (err: any) {
      if (err.message.includes('Signature verification failed')) {
        pass('Test 2 - Invalid signature strictly rejected with verification error');
      } else {
        fail('Test 2 - Unexpected error message:', err.message);
      }
    }

    // Test 3: Missing webhook secret handling
    try {
      verifyWebhookSignature(dummyPayload, 'valid_mock_signature', '', mockStripeForSig);
      fail('Test 3 - Expected empty secret to throw configuration error');
    } catch (err: any) {
      pass('Test 3 - Missing/empty webhook secret rejected safely');
    }

    // ------------------------------------------------------------------------
    // SECTION 2: Mapping Helpers Tests
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Price and Status Mapping ---');

    const mappedMonthly = mapStripePriceToPlan(testMonthlyPriceId);
    if (mappedMonthly === 'monthly') {
      pass(`Test 4 - Monthly Price ID (${testMonthlyPriceId}) maps to "monthly"`);
    } else {
      fail(`Test 4 - Expected "monthly", got "${mappedMonthly}"`);
    }

    const mappedYearly = mapStripePriceToPlan(testYearlyPriceId);
    if (mappedYearly === 'annual') {
      pass(`Test 5 - Yearly Price ID (${testYearlyPriceId}) maps to "annual" (matching DB check constraint)`);
    } else {
      fail(`Test 5 - Expected "annual", got "${mappedYearly}"`);
    }

    if (
      mapStripeStatusToDb('active') === 'active' &&
      mapStripeStatusToDb('trialing') === 'active' &&
      mapStripeStatusToDb('canceled') === 'cancelled' &&
      mapStripeStatusToDb('past_due') === 'pending'
    ) {
      pass('Test 6 - Stripe statuses correctly map to database check constraints');
    } else {
      fail('Test 6 - Status mapping failed');
    }

    // ------------------------------------------------------------------------
    // SECTION 3: Event 1 - checkout.session.completed
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Event Handling: checkout.session.completed ---');

    const nowSeconds = Math.floor(Date.now() / 1000);
    const mockCheckoutEvent: Stripe.Event = {
      id: `evt_checkout_${Date.now()}`,
      object: 'event',
      api_version: '2024-12-18.acacia',
      created: nowSeconds,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_mock_123',
          object: 'checkout.session',
          mode: 'subscription',
          subscription: 'sub_test_mock_123',
          customer_email: testUserEmail,
          metadata: {
            userId: testUserId,
            plan: 'monthly',
          },
        } as unknown as Stripe.Checkout.Session,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    const mockStripeForRetrieval = {
      subscriptions: {
        retrieve: async (subId: string) => ({
          id: subId,
          status: 'active',
          current_period_start: nowSeconds,
          current_period_end: nowSeconds + 30 * 24 * 60 * 60,
          items: {
            data: [{ price: { id: testMonthlyPriceId } }],
          },
          metadata: { userId: testUserId, plan: 'monthly' },
        }),
      },
      customers: {
        retrieve: async (cusId: string) => ({
          id: cusId,
          email: testUserEmail,
        }),
      },
    } as unknown as Stripe;

    // Process checkout.session.completed
    await processWebhookEvent(mockCheckoutEvent, pool, mockStripeForRetrieval);

    // Verify record in public.subscriptions
    const subRes = await pool.query(
      'SELECT id, user_id, plan, status, started_at, expires_at FROM public.subscriptions WHERE user_id = $1 AND status = $2',
      [testUserId, 'active']
    );

    if (subRes.rows.length === 1) {
      const sub = subRes.rows[0];
      if (sub.plan === 'monthly' && sub.status === 'active' && new Date(sub.expires_at) > new Date(sub.started_at)) {
        pass('Test 7 - checkout.session.completed successfully created active subscription in public.subscriptions');
      } else {
        fail(`Test 7 - Subscription created with invalid attributes: ${JSON.stringify(sub)}`);
      }
    } else {
      fail(`Test 7 - Expected 1 active subscription, found ${subRes.rows.length}`);
    }

    // ------------------------------------------------------------------------
    // SECTION 4: Idempotency & Duplicate Protection
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Idempotency & Duplicate Protection ---');

    // Send the EXACT SAME event again
    const dupResult = await processWebhookEvent(mockCheckoutEvent, pool, mockStripeForRetrieval);
    if (dupResult.duplicate) {
      pass('Test 8 - Duplicate Stripe event was detected and safely skipped (idempotency preserved)');
    } else {
      fail('Test 8 - Duplicate event was not flagged as duplicate');
    }

    // Verify still exactly 1 active subscription record
    const subCountRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM public.subscriptions WHERE user_id = $1',
      [testUserId]
    );
    if (subCountRes.rows[0].count === 1) {
      pass('Test 9 - Idempotent event did not create duplicate rows in public.subscriptions (count = 1)');
    } else {
      fail(`Test 9 - Duplicate rows created: count = ${subCountRes.rows[0].count}`);
    }

    // ------------------------------------------------------------------------
    // SECTION 5: Event 2 - customer.subscription.updated
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Event Handling: customer.subscription.updated ---');

    const newPeriodEnd = nowSeconds + 365 * 24 * 60 * 60; // Upgraded to yearly
    const mockUpdateEvent: Stripe.Event = {
      id: `evt_sub_updated_${Date.now()}`,
      object: 'event',
      api_version: '2024-12-18.acacia',
      created: nowSeconds,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_mock_123',
          object: 'subscription',
          status: 'active',
          current_period_start: nowSeconds,
          current_period_end: newPeriodEnd,
          items: {
            data: [{ price: { id: testYearlyPriceId } }],
          },
          metadata: {
            userId: testUserId,
            plan: 'yearly',
          },
        } as unknown as Stripe.Subscription,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    await processWebhookEvent(mockUpdateEvent, pool, mockStripeForRetrieval);

    // Verify subscription updated to annual plan
    const updatedSubRes = await pool.query(
      'SELECT id, plan, status, expires_at FROM public.subscriptions WHERE user_id = $1 AND status = $2',
      [testUserId, 'active']
    );

    if (updatedSubRes.rows.length === 1 && updatedSubRes.rows[0].plan === 'annual') {
      pass('Test 10 - customer.subscription.updated successfully synchronized plan update ("annual") in public.subscriptions');
    } else {
      fail(`Test 10 - Expected plan "annual", got ${JSON.stringify(updatedSubRes.rows[0])}`);
    }

    // ------------------------------------------------------------------------
    // SECTION 6: Event 3 - customer.subscription.deleted
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Event Handling: customer.subscription.deleted ---');

    const mockDeleteEvent: Stripe.Event = {
      id: `evt_sub_deleted_${Date.now()}`,
      object: 'event',
      api_version: '2024-12-18.acacia',
      created: nowSeconds,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test_mock_123',
          object: 'subscription',
          status: 'canceled',
          canceled_at: nowSeconds,
          current_period_start: nowSeconds,
          current_period_end: newPeriodEnd,
          items: {
            data: [{ price: { id: testYearlyPriceId } }],
          },
          metadata: {
            userId: testUserId,
            plan: 'yearly',
          },
        } as unknown as Stripe.Subscription,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    await processWebhookEvent(mockDeleteEvent, pool, mockStripeForRetrieval);

    // Verify subscription status is now 'cancelled' and historical row is preserved
    const deletedSubRes = await pool.query(
      'SELECT id, status, cancelled_at FROM public.subscriptions WHERE user_id = $1',
      [testUserId]
    );

    if (deletedSubRes.rows.length === 1 && deletedSubRes.rows[0].status === 'cancelled' && deletedSubRes.rows[0].cancelled_at !== null) {
      pass('Test 11 - customer.subscription.deleted updated status to "cancelled" and preserved historical row (never deleted)');
    } else {
      fail(`Test 11 - Expected status "cancelled", got ${JSON.stringify(deletedSubRes.rows[0])}`);
    }

    // ------------------------------------------------------------------------
    // SECTION 7: Invariant Checks: Role non-escalation
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Role & Authorization Invariants ---');

    const userRowRes = await pool.query('SELECT role FROM public.users WHERE id = $1', [testUserId]);
    if (userRowRes.rows[0]?.role === 'visitor') {
      pass('Test 12 - Webhook processing strictly maintains user role = "visitor" (no automatic role escalation in Step 3)');
    } else {
      fail(`Test 12 - Expected role "visitor", got "${userRowRes.rows[0]?.role}"`);
    }

    // ------------------------------------------------------------------------
    // SECTION 8: Idempotency Table Verification
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Idempotency Table Records ---');

    const eventRecordsRes = await pool.query(
      'SELECT stripe_event_id, event_type FROM public.stripe_webhook_events WHERE stripe_event_id IN ($1, $2, $3)',
      [mockCheckoutEvent.id, mockUpdateEvent.id, mockDeleteEvent.id]
    );

    if (eventRecordsRes.rows.length === 3) {
      pass('Test 13 - All 3 processed Stripe event IDs recorded in public.stripe_webhook_events table');
    } else {
      fail(`Test 13 - Expected 3 recorded events, found ${eventRecordsRes.rows.length}`);
    }

    // ------------------------------------------------------------------------
    // SECTION 9: Backend Health Check
    // ------------------------------------------------------------------------
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      pass('Test 14 - Database and backend health verified OK');
    } else {
      fail('Test 14 - Database health check failed');
    }

    // Clean up test records
    await pool.query('DELETE FROM public.stripe_webhook_events WHERE stripe_event_id IN ($1, $2, $3)', [
      mockCheckoutEvent.id,
      mockUpdateEvent.id,
      mockDeleteEvent.id,
    ]);
    await pool.query('DELETE FROM public.subscriptions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM public.users WHERE id = $1', [testUserId]);
    await supabase.auth.admin.deleteUser(testUserId);
    console.log('\nTest data cleaned up successfully.');

  } catch (err: any) {
    fail('Unexpected error in Stripe Webhook verification suite:', err.message);
  } finally {
    await pool.end();
  }

  console.log(`\n========================================`);
  console.log(`STRIPE WEBHOOK VERIFICATION RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================\n`);

  process.exit(allPassed ? 0 : 1);
}

runStripeWebhookVerification();
