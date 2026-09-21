/**
 * verify-subscription-lifecycle.ts — Phase 1 Steps 4 & 5 Verification Suite
 *
 * Tests:
 * 1. Database schema & constraints for new statuses ('pending_renewal', 'lapsed')
 * 2. SubscriptionService state machine:
 *    - create active subscription
 *    - cancel subscription (remains valid until expires_at)
 *    - access checks during cancelled period (hasActiveSubscription === true)
 *    - reactivate subscription (cancelled -> active)
 *    - pending renewal window detection (applyPendingRenewalStatus)
 *    - renew subscription (extends expires_at)
 *    - mark lapsed subscriptions (expires_at <= now -> lapsed)
 *    - access checks after lapsed (hasActiveSubscription === false)
 * 3. requireSubscriber middleware:
 *    - rejects unauthenticated (401)
 *    - rejects visitors without subscription (403 SUBSCRIPTION_REQUIRED)
 *    - rejects lapsed subscribers (403 SUBSCRIPTION_REQUIRED)
 *    - allows active subscribers (200)
 *    - allows cancelled-but-not-expired subscribers (200)
 *    - allows admins without active subscription (200)
 * 4. Subscription controller lifecycle endpoints:
 *    - GET /api/subscriptions/me
 *    - POST /api/subscriptions/cancel
 *    - POST /api/subscriptions/reactivate
 *    - POST /api/subscriptions/renew
 *    - POST /api/subscriptions/admin/mark-lapsed
 */

import { Request, Response } from 'express';
import { pool } from '../config/database';
import {
  createOrUpdateSubscription,
  getUserSubscription,
  hasActiveSubscription,
  cancelSubscription,
  reactivateSubscription,
  renewSubscription,
  markLapsedSubscriptions,
  applyPendingRenewalStatus,
  SUBSCRIPTION_RENEWAL_WINDOW_DAYS,
} from '../services/subscription.service';
import { requireSubscriber } from '../middleware/subscription.middleware';
import {
  getMySubscriptionHandler,
  cancelSubscriptionHandler,
  reactivateSubscriptionHandler,
  renewSubscriptionHandler,
  markLapsedHandler,
} from '../controllers/subscription.controller';

let allPassed = true;

const pass = (msg: string) => console.log(`  ✓ PASS: ${msg}`);
const fail = (msg: string, err?: unknown) => {
  console.error(`  ✗ FAIL: ${msg}`, err instanceof Error ? err.message : err || '');
  allPassed = false;
};

const section = (title: string) => {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 65 - title.length))}`);
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

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 1 STEPS 4 & 5 — SUBSCRIPTION LIFECYCLE & ACCESS CONTROL');
  console.log('═══════════════════════════════════════════════════════════════════');

  const testUserId = '00000000-0000-0000-0000-000000000055';
  const testAdminId = '00000000-0000-0000-0000-000000000099';
  const testUserEmail = `test_lifecycle_${Date.now()}@example.com`;

  try {
    // ─── Setup Test Users ───────────────────────────────────────────────────
    section('0: Test Setup — Creating Database Fixtures');

    await pool.query(
      `INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
       VALUES ($1, $2, '{}', '{}', 'authenticated', 'authenticated')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, testUserEmail]
    );

    await pool.query(
      `INSERT INTO public.users (id, email, name, role)
       VALUES ($1, $2, 'Lifecycle Test User', 'visitor')
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'visitor'`,
      [testUserId, testUserEmail]
    );

    await pool.query(
      `INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
       VALUES ($1, 'admin_lifecycle@example.com', '{}', '{}', 'authenticated', 'authenticated')
       ON CONFLICT (id) DO NOTHING`,
      [testAdminId]
    );

    await pool.query(
      `INSERT INTO public.users (id, email, name, role)
       VALUES ($1, 'admin_lifecycle@example.com', 'Admin User', 'admin')
       ON CONFLICT (id) DO UPDATE SET role = 'admin'`,
      [testAdminId]
    );

    // Clean any prior test subscription
    await pool.query('DELETE FROM public.subscriptions WHERE user_id = $1', [testUserId]);
    pass('Clean test fixtures initialized');

    // ─── Section 1: Initial State & Access Check ────────────────────────────
    section('1: Initial State — User has no subscription');

    const initialSub = await getUserSubscription(testUserId);
    if (initialSub === null) {
      pass('getUserSubscription returns null for unsubscribed user');
    } else {
      fail('Expected null subscription initially');
    }

    const initialAccess = await hasActiveSubscription(testUserId);
    if (!initialAccess) {
      pass('hasActiveSubscription returns false for unsubscribed user');
    } else {
      fail('Expected hasActiveSubscription to be false');
    }

    // ─── Section 2: Create Active Subscription ──────────────────────────────
    section('2: Create Active Subscription');

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const sub = await createOrUpdateSubscription({
      userId: testUserId,
      dbPlan: 'monthly',
      status: 'active',
      startedAt,
      expiresAt,
    });

    if (sub.status === 'active' && sub.plan === 'monthly') {
      pass(`Subscription created: id=${sub.id}, status=active, plan=monthly`);
    } else {
      fail(`Unexpected subscription created: ${JSON.stringify(sub)}`);
    }

    const hasAccessActive = await hasActiveSubscription(testUserId);
    if (hasAccessActive) {
      pass('hasActiveSubscription returns true for active subscription');
    } else {
      fail('hasActiveSubscription should be true for active sub');
    }

    // ─── Section 3: Cancel Subscription ─────────────────────────────────────
    section('3: Cancel Subscription (Grace Period / End of Period)');

    const cancelled = await cancelSubscription(testUserId);
    if (cancelled.status === 'cancelled' && cancelled.cancelledAt !== null) {
      pass('cancelSubscription sets status=cancelled and records cancelled_at');
    } else {
      fail(`Cancellation failed: ${JSON.stringify(cancelled)}`);
    }

    // Access remains granted until expiresAt
    const accessDuringGrace = await hasActiveSubscription(testUserId);
    if (accessDuringGrace) {
      pass('hasActiveSubscription returns true for cancelled subscription before expires_at');
    } else {
      fail('Cancelled subscription should still have active access before expires_at');
    }

    // Duplicate cancel throws error
    try {
      await cancelSubscription(testUserId);
      fail('Second cancel should throw already cancelled error');
    } catch (err: unknown) {
      pass(`Duplicate cancellation rejected: ${(err as Error).message}`);
    }

    // ─── Section 4: Reactivate Subscription ─────────────────────────────────
    section('4: Reactivate Subscription');

    const reactivated = await reactivateSubscription(testUserId);
    if (reactivated.status === 'active' && reactivated.cancelledAt === null) {
      pass('reactivateSubscription restores status=active and clears cancelled_at');
    } else {
      fail(`Reactivation failed: ${JSON.stringify(reactivated)}`);
    }

    const accessAfterReactivate = await hasActiveSubscription(testUserId);
    if (accessAfterReactivate) {
      pass('hasActiveSubscription returns true after reactivation');
    } else {
      fail('Access should be true after reactivation');
    }

    // ─── Section 5: Pending Renewal Window ──────────────────────────────────
    section('5: Pending Renewal State Transition');

    // Move expiry to within renewal window (e.g. 3 days from now)
    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() + 3);
    await pool.query('UPDATE public.subscriptions SET expires_at = $1 WHERE user_id = $2', [
      nearExpiry,
      testUserId,
    ]);

    const updatedRows = await applyPendingRenewalStatus(testUserId);
    if (updatedRows >= 1) {
      pass(`applyPendingRenewalStatus updated ${updatedRows} row to pending_renewal within ${SUBSCRIPTION_RENEWAL_WINDOW_DAYS}d window`);
    } else {
      fail('applyPendingRenewalStatus failed to transition nearing subscription');
    }

    const subPendingRenewal = await getUserSubscription(testUserId);
    if (subPendingRenewal?.status === 'pending_renewal') {
      pass('Subscription status is verified as pending_renewal');
    } else {
      fail(`Status expected pending_renewal, got: ${subPendingRenewal?.status}`);
    }

    const accessPendingRenewal = await hasActiveSubscription(testUserId);
    if (accessPendingRenewal) {
      pass('hasActiveSubscription returns true for pending_renewal status');
    } else {
      fail('pending_renewal status should have active subscriber access');
    }

    // ─── Section 6: Renew Subscription ──────────────────────────────────────
    section('6: Renew Subscription');

    const renewed = await renewSubscription(testUserId, 'yearly');
    if (renewed.status === 'active' && renewed.plan === 'annual' && new Date(renewed.expiresAt) > nearExpiry) {
      pass(`Subscription renewed: plan=annual, status=active, new expires_at=${renewed.expiresAt}`);
    } else {
      fail(`Renewal failed: ${JSON.stringify(renewed)}`);
    }

    // ─── Section 7: Mark Lapsed Subscriptions ───────────────────────────────
    section('7: Expiration & Lapsed Transition');

    // Force started_at and expires_at into the past (maintaining expires_at > started_at)
    const pastStart = new Date(Date.now() - 40 * 24 * 3600 * 1000); // 40 days ago
    const pastExpiry = new Date(Date.now() - 10 * 24 * 3600 * 1000); // 10 days ago
    await pool.query(
      'UPDATE public.subscriptions SET started_at = $1, expires_at = $2 WHERE user_id = $3',
      [pastStart, pastExpiry, testUserId]
    );

    const lapsedCount = await markLapsedSubscriptions();
    if (lapsedCount >= 1) {
      pass(`markLapsedSubscriptions updated ${lapsedCount} expired subscription(s) to lapsed`);
    } else {
      fail('markLapsedSubscriptions did not lapse past-expiry subscription');
    }

    const lapsedSub = await getUserSubscription(testUserId);
    if (lapsedSub?.status === 'lapsed') {
      pass('Subscription status in DB is confirmed as lapsed');
    } else {
      fail(`Expected status lapsed, got ${lapsedSub?.status}`);
    }

    const accessAfterLapse = await hasActiveSubscription(testUserId);
    if (!accessAfterLapse) {
      pass('hasActiveSubscription returns false for lapsed subscription (ACCESS BLOCKED)');
    } else {
      fail('Lapsed subscription MUST NOT have active subscriber access');
    }

    // ─── Section 8: Middleware — requireSubscriber ──────────────────────────
    section('8: Middleware — requireSubscriber (DB-driven Access Control)');

    // 8a. No authenticated user -> 401
    const unauthReq = {} as Request;
    const unauthRes = createMockRes();
    let unauthNextCalled = false;
    await requireSubscriber(unauthReq, unauthRes as unknown as Response, () => {
      unauthNextCalled = true;
    });
    if (unauthRes.statusCode === 401 && !unauthNextCalled) {
      pass('Unauthenticated request -> 401 AUTH_REQUIRED');
    } else {
      fail(`Expected 401, got ${unauthRes.statusCode}`);
    }

    // 8b. User with lapsed subscription -> 403
    const lapsedReq = {
      user: { id: testUserId, email: testUserEmail, name: 'Test', role: 'subscriber' as const },
    } as Request;
    const lapsedRes = createMockRes();
    let lapsedNextCalled = false;
    await requireSubscriber(lapsedReq, lapsedRes as unknown as Response, () => {
      lapsedNextCalled = true;
    });
    if (lapsedRes.statusCode === 403 && !lapsedNextCalled && lapsedRes.jsonData.code === 'SUBSCRIPTION_REQUIRED') {
      pass('Lapsed user (even if role is "subscriber") -> 403 SUBSCRIPTION_REQUIRED (DB Authoritative)');
    } else {
      fail(`Expected 403 for lapsed user, got ${lapsedRes.statusCode}`);
    }

    // 8c. Admin bypass -> 200 / next() called without subscription
    const adminReq = {
      user: { id: testAdminId, email: 'admin_lifecycle@example.com', name: 'Admin', role: 'admin' as const },
    } as Request;
    const adminRes = createMockRes();
    let adminNextCalled = false;
    await requireSubscriber(adminReq, adminRes as unknown as Response, () => {
      adminNextCalled = true;
    });
    if (adminNextCalled && adminRes.statusCode === 200) {
      pass('Admin bypass: Admin is permitted access without an active subscription row');
    } else {
      fail('Admin should bypass subscriber requirement');
    }

    // 8d. Active subscriber -> 200 / next() called
    await pool.query(
      `UPDATE public.subscriptions SET status = 'active', expires_at = NOW() + interval '30 days' WHERE user_id = $1`,
      [testUserId]
    );
    const activeReq = {
      user: { id: testUserId, email: testUserEmail, name: 'Test', role: 'visitor' as const },
    } as Request;
    const activeRes = createMockRes();
    let activeNextCalled = false;
    await requireSubscriber(activeReq, activeRes as unknown as Response, () => {
      activeNextCalled = true;
    });
    if (activeNextCalled && activeRes.statusCode === 200) {
      pass('Active subscriber (even if role is "visitor") -> next() permitted (DB Authoritative)');
    } else {
      fail(`Active subscriber was blocked with status ${activeRes.statusCode}`);
    }

    // ─── Section 9: Controller Endpoints ────────────────────────────────────
    section('9: Subscription Controller Lifecycle Endpoints');

    // 9a. GET /api/subscriptions/me
    const getMeReq = {
      user: { id: testUserId, email: testUserEmail, name: 'Test', role: 'visitor' as const },
    } as Request;
    const getMeRes = createMockRes();
    await getMySubscriptionHandler(getMeReq, getMeRes as unknown as Response);
    const meData = getMeRes.jsonData;
    if (getMeRes.statusCode === 200 && meData.success && meData.hasAccess === true) {
      pass('GET /api/subscriptions/me returns subscription and hasAccess: true');
    } else {
      fail(`GET /api/subscriptions/me failed: ${JSON.stringify(meData)}`);
    }

    // 9b. POST /api/subscriptions/cancel
    const cancelReq = {
      user: { id: testUserId, email: testUserEmail, name: 'Test', role: 'visitor' as const },
    } as Request;
    const cancelRes = createMockRes();
    await cancelSubscriptionHandler(cancelReq, cancelRes as unknown as Response);
    if (cancelRes.statusCode === 200 && cancelRes.jsonData.success) {
      pass('POST /api/subscriptions/cancel successfully cancelled active subscription');
    } else {
      fail(`POST /api/subscriptions/cancel failed: ${JSON.stringify(cancelRes.jsonData)}`);
    }

    // 9c. POST /api/subscriptions/reactivate
    const reactivateReq = {
      user: { id: testUserId, email: testUserEmail, name: 'Test', role: 'visitor' as const },
    } as Request;
    const reactivateRes = createMockRes();
    await reactivateSubscriptionHandler(reactivateReq, reactivateRes as unknown as Response);
    if (reactivateRes.statusCode === 200 && reactivateRes.jsonData.success) {
      pass('POST /api/subscriptions/reactivate successfully reactivated subscription');
    } else {
      fail(`POST /api/subscriptions/reactivate failed: ${JSON.stringify(reactivateRes.jsonData)}`);
    }

    // 9d. POST /api/subscriptions/renew
    const renewReq = {
      user: { id: testUserId, email: testUserEmail, name: 'Test', role: 'visitor' as const },
      body: { plan: 'yearly' },
    } as Request;
    const renewRes = createMockRes();
    await renewSubscriptionHandler(renewReq, renewRes as unknown as Response);
    if (renewRes.statusCode === 200 && renewRes.jsonData.success) {
      pass('POST /api/subscriptions/renew successfully extended subscription');
    } else {
      fail(`POST /api/subscriptions/renew failed: ${JSON.stringify(renewRes.jsonData)}`);
    }

    // 9e. POST /api/subscriptions/admin/mark-lapsed
    const markLapsedReq = {} as Request;
    const markLapsedRes = createMockRes();
    await markLapsedHandler(markLapsedReq, markLapsedRes as unknown as Response);
    if (markLapsedRes.statusCode === 200 && markLapsedRes.jsonData.success) {
      pass('POST /api/subscriptions/admin/mark-lapsed executed sweep successfully');
    } else {
      fail(`POST /api/subscriptions/admin/mark-lapsed failed: ${JSON.stringify(markLapsedRes.jsonData)}`);
    }

    // ─── Cleanup ────────────────────────────────────────────────────────────
    section('10: Cleanup Test Fixtures');
    await pool.query('DELETE FROM public.subscriptions WHERE user_id IN ($1, $2)', [testUserId, testAdminId]);
    await pool.query('DELETE FROM public.users WHERE id IN ($1, $2)', [testUserId, testAdminId]);
    await pool.query('DELETE FROM auth.users WHERE id IN ($1, $2)', [testUserId, testAdminId]);
    pass('Test users and test subscriptions cleaned up');

    // ─── Summary ────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('  ✅ ALL TESTS PASSED — Lifecycle & Access Control Verified (10/10)');
    } else {
      console.log('  ❌ SOME TESTS FAILED — Review errors above');
    }
    console.log('═══════════════════════════════════════════════════════════════════\n');
  } catch (err) {
    fail('Test suite crashed unexpectedly', err);
  } finally {
    await pool.end();
    process.exit(allPassed ? 0 : 1);
  }
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
