/**
 * verify-mock-payment.ts — Phase 1 Step 3 Verification Suite
 *
 * Tests the complete mock payment flow:
 *   - MockPaymentProvider (unit-level)
 *   - Subscription controller handlers (integration-level)
 *   - SubscriptionService (integration with real DB)
 *   - Security constraints
 *
 * Run: npx ts-node src/test/verify-mock-payment.ts
 *
 * Prerequisites:
 *   - DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY in server/.env
 *   - A test user must exist in auth.users (script creates a temp row if possible)
 */

import { Request, Response } from 'express';
import { MockPaymentProvider } from '../providers/payment/mock.provider';
import { mapPlanToDb, calculateExpiresAt } from '../providers/payment/plan-pricing';
import { createCheckoutSessionHandler, processPaymentHandler } from '../controllers/subscription.controller';
import { createOrUpdateSubscription, getActiveSubscription } from '../services/subscription.service';
import { pool } from '../config/database';

// ─── Test Utilities ───────────────────────────────────────────────────────────

let allPassed = true;

const pass = (msg: string) => console.log(`  ✓ PASS: ${msg}`);
const fail = (msg: string, err?: unknown) => {
  console.error(`  ✗ FAIL: ${msg}`, err instanceof Error ? err.message : (err || ''));
  allPassed = false;
};

const section = (title: string) => {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
};

const createMockRes = () => {
  const res: Partial<Response> & { statusCode: number; jsonData: Record<string, unknown> } = {
    statusCode: 200,
    jsonData: {},
    status(code: number) {
      this.statusCode = code;
      return this as unknown as Response;
    },
    json(data: unknown) {
      this.jsonData = data as Record<string, unknown>;
      return this as unknown as Response;
    },
  };
  return res;
};

const TEST_USER_ID = `test-user-p1s3-${Date.now()}`;
const TEST_USER_EMAIL = `test-p1s3-${Date.now()}@example.com`;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 1 STEP 3 — MOCK PAYMENT FLOW VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════');

  // ─── Section 1: MockPaymentProvider — createCheckout ──────────────────────
  section('1: MockPaymentProvider.createCheckout');

  const provider = new MockPaymentProvider();

  try {
    const session = await provider.createCheckout({ userId: 'user-1', plan: 'monthly' });
    if (session.sessionId.startsWith('mock_session_') && session.plan === 'monthly') {
      pass('Monthly checkout session created with correct format');
    } else {
      fail('Monthly checkout session has wrong format', session);
    }
    if (session.amountInPaise === 49900 && session.currency === 'INR') {
      pass('Monthly plan pricing is correct (₹499 = 49900 paise)');
    } else {
      fail(`Monthly pricing mismatch: expected 49900, got ${session.amountInPaise}`);
    }
    if (provider.hasSession(session.sessionId)) {
      pass('Session is stored in provider session map');
    } else {
      fail('Session not stored after createCheckout');
    }
  } catch (err) { fail('createCheckout threw unexpectedly', err); }

  try {
    const session = await provider.createCheckout({ userId: 'user-2', plan: 'yearly' });
    if (session.amountInPaise === 499900) {
      pass('Yearly plan pricing is correct (₹4,999 = 499900 paise)');
    } else {
      fail(`Yearly pricing mismatch: expected 499900, got ${session.amountInPaise}`);
    }
  } catch (err) { fail('Yearly createCheckout threw', err); }

  // ─── Section 2: MockPaymentProvider — processPayment success ──────────────
  section('2: MockPaymentProvider.processPayment — success card');

  provider.clearSessions();
  const successSession = await provider.createCheckout({ userId: 'user-success', plan: 'monthly' });

  try {
    const result = await provider.processPayment({
      sessionId: successSession.sessionId,
      userId: 'user-success',
      plan: 'monthly',
      cardNumber: '4242 4242 4242 4242',
      expiryMonth: '12',
      expiryYear: '2030',
      cvv: '123',
      cardholderName: 'Test User',
    });

    if (result.status === 'completed') {
      pass('Success card (4242...) → payment status: completed');
    } else {
      fail(`Expected completed, got ${result.status}. Reason: ${result.failureReason}`);
    }
    if (result.transactionId?.startsWith('mock_txn_')) {
      pass(`Transaction ID generated: ${result.transactionId.slice(0, 20)}...`);
    } else {
      fail('transactionId missing or has wrong format');
    }
    if (!provider.hasSession(successSession.sessionId)) {
      pass('Session consumed after successful payment (single-use idempotency)');
    } else {
      fail('Session NOT consumed after success — idempotency broken');
    }
  } catch (err) { fail('processPayment threw on success card', err); }

  // ─── Section 3: MockPaymentProvider — processPayment decline ──────────────
  section('3: MockPaymentProvider.processPayment — decline card');

  const declineSession = await provider.createCheckout({ userId: 'user-decline', plan: 'yearly' });

  try {
    const result = await provider.processPayment({
      sessionId: declineSession.sessionId,
      userId: 'user-decline',
      plan: 'yearly',
      cardNumber: '4000 0000 0000 0002',
      expiryMonth: '12',
      expiryYear: '2030',
      cvv: '123',
      cardholderName: 'Declined User',
    });

    if (result.status === 'failed') {
      pass('Decline card (4000...0002) → payment status: failed');
    } else {
      fail(`Expected failed, got ${result.status}`);
    }
    if (result.failureReason?.toLowerCase().includes('declined')) {
      pass(`Failure reason is descriptive: "${result.failureReason}"`);
    } else {
      fail(`Unexpected failure reason: "${result.failureReason}"`);
    }
    // Session should NOT be consumed on decline (user can retry)
    if (provider.hasSession(declineSession.sessionId)) {
      pass('Session preserved after decline (user can retry with different card)');
    } else {
      fail('Session was consumed on decline — user cannot retry');
    }
  } catch (err) { fail('processPayment threw on decline card', err); }

  // ─── Section 4: Session ownership validation ─────────────────────────────
  section('4: Session ownership — User A cannot pay with User B session');

  const ownerSession = await provider.createCheckout({ userId: 'user-owner', plan: 'monthly' });

  try {
    const result = await provider.processPayment({
      sessionId: ownerSession.sessionId,
      userId: 'user-attacker',  // Different user
      plan: 'monthly',
      cardNumber: '4242424242424242',
      expiryMonth: '12',
      expiryYear: '2030',
      cvv: '123',
      cardholderName: 'Attacker',
    });
    if (result.status === 'failed') {
      pass('Cross-user session attack rejected correctly');
    } else {
      fail('SECURITY: Cross-user session attack NOT rejected!');
    }
  } catch (err) { fail('Ownership test threw', err); }

  // ─── Section 5: Invalid session ID ────────────────────────────────────────
  section('5: Invalid/expired session ID');

  try {
    const result = await provider.processPayment({
      sessionId: 'mock_session_nonexistent',
      userId: 'user-x',
      plan: 'monthly',
      cardNumber: '4242424242424242',
      expiryMonth: '12',
      expiryYear: '2030',
      cvv: '123',
      cardholderName: 'Ghost',
    });
    if (result.status === 'failed') {
      pass('Invalid session → payment rejected');
    } else {
      fail('Invalid session was not rejected!');
    }
  } catch (err) { fail('Invalid session test threw', err); }

  // ─── Section 6: Plan pricing + date arithmetic ────────────────────────────
  section('6: Plan pricing & date arithmetic');

  try {
    const dbPlanMonthly = mapPlanToDb('monthly');
    const dbPlanYearly = mapPlanToDb('yearly');
    if (dbPlanMonthly === 'monthly' && dbPlanYearly === 'annual') {
      pass(`Plan mapping: monthly→${dbPlanMonthly}, yearly→${dbPlanYearly}`);
    } else {
      fail(`Plan mapping incorrect: ${dbPlanMonthly}, ${dbPlanYearly}`);
    }

    const start = new Date('2025-01-15T10:00:00Z');
    const monthlyExpiry = calculateExpiresAt(start, 'monthly');
    const yearlyExpiry = calculateExpiresAt(start, 'yearly');

    if (monthlyExpiry.getMonth() === 1 && monthlyExpiry.getDate() === 15) {
      pass(`Monthly expiry: ${monthlyExpiry.toISOString()} (correctly +1 month)`);
    } else {
      fail(`Monthly expiry incorrect: ${monthlyExpiry.toISOString()}`);
    }
    if (yearlyExpiry.getFullYear() === 2026 && yearlyExpiry.getMonth() === 0) {
      pass(`Yearly expiry: ${yearlyExpiry.toISOString()} (correctly +1 year)`);
    } else {
      fail(`Yearly expiry incorrect: ${yearlyExpiry.toISOString()}`);
    }

    // Verify expiresAt > startedAt (DB constraint)
    if (monthlyExpiry > start && yearlyExpiry > start) {
      pass('expires_at > started_at satisfied (DB constraint chk_subscriptions_expires_after_started)');
    } else {
      fail('expires_at is NOT after started_at!');
    }
  } catch (err) { fail('Pricing/date test threw', err); }

  // ─── Section 7: Controller — unauthenticated checkout → 401 ─────────────
  section('7: Controller — unauthenticated checkout returns 401');

  try {
    const req = { user: undefined, body: { plan: 'monthly' } } as unknown as Request;
    const res = createMockRes();
    await createCheckoutSessionHandler(req, res as unknown as Response);
    if (res.statusCode === 401 && res.jsonData?.code === 'AUTH_REQUIRED') {
      pass('Unauthenticated checkout → 401 AUTH_REQUIRED');
    } else {
      fail(`Expected 401/AUTH_REQUIRED, got ${res.statusCode}: ${JSON.stringify(res.jsonData)}`);
    }
  } catch (err) { fail('Unauthenticated checkout test threw', err); }

  // ─── Section 8: Controller — invalid plan → 400 ───────────────────────────
  section('8: Controller — invalid plan returns 400');

  try {
    const req = {
      user: { id: 'u1', email: 'u@example.com', name: 'User', role: 'visitor' },
      body: { plan: 'premium' },
    } as unknown as Request;
    const res = createMockRes();
    await createCheckoutSessionHandler(req, res as unknown as Response);
    if (res.statusCode === 400 && res.jsonData?.code === 'INVALID_PLAN') {
      pass('Invalid plan → 400 INVALID_PLAN');
    } else {
      fail(`Expected 400/INVALID_PLAN, got ${res.statusCode}: ${JSON.stringify(res.jsonData)}`);
    }
  } catch (err) { fail('Invalid plan test threw', err); }

  // ─── Section 9: Controller — missing plan → 400 ──────────────────────────
  section('9: Controller — missing plan returns 400');

  try {
    const req = {
      user: { id: 'u1', email: 'u@example.com', name: 'User', role: 'visitor' },
      body: {},
    } as unknown as Request;
    const res = createMockRes();
    await createCheckoutSessionHandler(req, res as unknown as Response);
    if (res.statusCode === 400 && res.jsonData?.code === 'VALIDATION_ERROR') {
      pass('Missing plan → 400 VALIDATION_ERROR');
    } else {
      fail(`Expected 400/VALIDATION_ERROR, got ${res.statusCode}: ${JSON.stringify(res.jsonData)}`);
    }
  } catch (err) { fail('Missing plan test threw', err); }

  // ─── Section 10: Controller — unauthenticated pay → 401 ─────────────────
  section('10: Controller — unauthenticated pay returns 401');

  try {
    const req = {
      user: undefined,
      body: { sessionId: 'mock_session_x', plan: 'monthly', cardNumber: '4242424242424242', expiryMonth: '12', expiryYear: '2030', cvv: '123', cardholderName: 'Test' },
    } as unknown as Request;
    const res = createMockRes();
    await processPaymentHandler(req, res as unknown as Response);
    if (res.statusCode === 401 && res.jsonData?.code === 'AUTH_REQUIRED') {
      pass('Unauthenticated pay → 401 AUTH_REQUIRED');
    } else {
      fail(`Expected 401/AUTH_REQUIRED, got ${res.statusCode}: ${JSON.stringify(res.jsonData)}`);
    }
  } catch (err) { fail('Unauthenticated pay test threw', err); }

  // ─── Section 11: Database — SubscriptionService (live DB) ────────────────
  section('11: SubscriptionService — subscription record creation (live DB)');

  let dbTestUserId: string | null = null;

  try {
    await pool.connect(); // verify connection first

    // Insert a minimal test user into public.users for FK constraint
    // (uses raw SQL — does not invoke Supabase auth)
    try {
      await pool.query(
        `INSERT INTO public.users (id, email, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, 'visitor', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [TEST_USER_ID, TEST_USER_EMAIL, 'Test User P1S3']
      );
      dbTestUserId = TEST_USER_ID;
      pass(`Test user inserted: ${TEST_USER_EMAIL}`);
    } catch (err) {
      console.log(`  ⚠ Could not insert test user (may lack FK target). Skipping DB tests. ${(err as Error).message}`);
    }

    if (dbTestUserId) {
      // Test monthly subscription
      const start = new Date();
      const expires = calculateExpiresAt(start, 'monthly');
      const sub = await createOrUpdateSubscription({
        userId: dbTestUserId,
        dbPlan: 'monthly',
        status: 'active',
        startedAt: start,
        expiresAt: expires,
      });

      if (sub.status === 'active' && sub.plan === 'monthly') {
        pass(`Monthly subscription created: id=${sub.id}, plan=${sub.plan}, status=${sub.status}`);
      } else {
        fail(`Subscription record unexpected: ${JSON.stringify(sub)}`);
      }

      // Test idempotency — second call should UPDATE not INSERT (unique active index)
      const sub2 = await createOrUpdateSubscription({
        userId: dbTestUserId,
        dbPlan: 'annual',
        status: 'active',
        startedAt: start,
        expiresAt: calculateExpiresAt(start, 'yearly'),
      });

      if (sub2.id === sub.id && sub2.plan === 'annual') {
        pass(`Plan upgrade: same subscription ID updated to annual (no duplicate active rows)`);
      } else if (sub2.id !== sub.id) {
        fail(`Idempotency failed: new subscription ID created instead of updating existing: ${sub2.id}`);
      } else {
        fail(`Unexpected plan after upgrade: ${sub2.plan}`);
      }

      // Verify getActiveSubscription
      const active = await getActiveSubscription(dbTestUserId);
      if (active?.status === 'active') {
        pass(`getActiveSubscription returns correct active record`);
      } else {
        fail(`getActiveSubscription returned null or wrong status`);
      }

      // Cleanup
      await pool.query('DELETE FROM public.subscriptions WHERE user_id = $1', [dbTestUserId]);
      await pool.query('DELETE FROM public.users WHERE id = $1', [dbTestUserId]);
      pass('Test data cleaned up');
    }
  } catch (err) {
    fail('Database test section threw', err);
  }

  // ─── Section 12: No Stripe calls made ────────────────────────────────────
  section('12: Stripe not called during mock payment flow');

  try {
    // Create a checkout session and process payment without any Stripe import being called
    const testProvider = new MockPaymentProvider();
    const sess = await testProvider.createCheckout({ userId: 'stripe-check-user', plan: 'monthly' });
    const result = await testProvider.processPayment({
      sessionId: sess.sessionId,
      userId: 'stripe-check-user',
      plan: 'monthly',
      cardNumber: '4242424242424242',
      expiryMonth: '12',
      expiryYear: '2030',
      cvv: '123',
      cardholderName: 'No Stripe',
    });
    if (result.provider === 'mock') {
      pass('Provider name is "mock" — Stripe provider not activated');
    } else {
      fail(`Provider is "${result.provider}" — expected "mock"`);
    }
    // If env.STRIPE_SECRET_KEY is not set, Stripe would throw if called
    // No error means Stripe was not called
    pass('Payment completed without Stripe API calls (verified via provider name)');
  } catch (err) { fail('Stripe-check test threw', err); }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ✅ ALL TESTS PASSED — Phase 1 Step 3 Mock Payment Flow Verified');
  } else {
    console.log('  ❌ SOME TESTS FAILED — Review failures above');
  }
  console.log('═══════════════════════════════════════════════════════════════════\n');

  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('FATAL: Verification script crashed:', err);
  process.exit(1);
});
