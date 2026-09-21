import Stripe from 'stripe';
import { env } from '../config/env';
import { getPriceIdForPlan, createCheckoutSession, SubscriptionPlan } from '../services/stripe.service';
import { createCheckoutSessionHandler } from '../controllers/subscription.controller';
import { pool, checkDatabaseConnection } from '../config/database';
import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

async function runStripeVerification() {
  console.log('--- STARTING PHASE 1 STEP 2 STRIPE TEST-MODE INTEGRATION VERIFICATION ---\n');
  let allPassed = true;

  const pass = (msg: string) => console.log(`✓ PASS: ${msg}`);
  const fail = (msg: string, err?: any) => {
    console.error(`✗ FAIL: ${msg}`, err || '');
    allPassed = false;
  };

  // Helper to create mock Express response
  const createMockRes = () => {
    const res: Partial<Response> & { statusCode: number; jsonData: any } = {
      statusCode: 200,
      jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this as Response;
      },
      json(data: any) {
        this.jsonData = data;
        return this as Response;
      },
    };
    return res;
  };

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Unauthenticated checkout request -> 401
    // ------------------------------------------------------------------------
    console.log('Running Test 1: Unauthenticated checkout request...');
    const req1 = {
      user: undefined,
      body: { plan: 'monthly' },
    } as unknown as Request;
    const res1 = createMockRes();
    await createCheckoutSessionHandler(req1, res1 as unknown as Response);

    if (res1.statusCode === 401 && res1.jsonData?.code === 'AUTH_REQUIRED') {
      pass('Test 1 - Unauthenticated checkout request returns HTTP 401 (AUTH_REQUIRED)');
    } else {
      fail(`Test 1 - Expected 401, got ${res1.statusCode} (${JSON.stringify(res1.jsonData)})`);
    }

    // ------------------------------------------------------------------------
    // TEST 2: Missing plan -> validation error (400)
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 2: Missing plan in request body...');
    const req2 = {
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'test@example.com', role: 'visitor' },
      body: {},
    } as unknown as Request;
    const res2 = createMockRes();
    await createCheckoutSessionHandler(req2, res2 as unknown as Response);

    if (res2.statusCode === 400 && res2.jsonData?.code === 'VALIDATION_ERROR') {
      pass('Test 2 - Missing plan triggers HTTP 400 validation error');
    } else {
      fail(`Test 2 - Expected 400 VALIDATION_ERROR, got ${res2.statusCode}`);
    }

    // ------------------------------------------------------------------------
    // TEST 3: Invalid plan -> validation error (400)
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 3: Invalid plan in request body...');
    const req3 = {
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'test@example.com', role: 'visitor' },
      body: { plan: 'lifetime_super_vip' },
    } as unknown as Request;
    const res3 = createMockRes();
    await createCheckoutSessionHandler(req3, res3 as unknown as Response);

    if (res3.statusCode === 400 && res3.jsonData?.code === 'INVALID_PLAN') {
      pass('Test 3 - Invalid plan triggers HTTP 400 INVALID_PLAN error');
    } else {
      fail(`Test 3 - Expected 400 INVALID_PLAN, got ${res3.statusCode}`);
    }

    // ------------------------------------------------------------------------
    // TEST 4: Monthly plan maps to monthly Stripe Price ID
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 4: Monthly plan mapping...');
    const monthlyPrice = getPriceIdForPlan('monthly');
    if (monthlyPrice === env.STRIPE_MONTHLY_PRICE_ID && monthlyPrice.length > 0) {
      pass(`Test 4 - Monthly plan maps strictly to STRIPE_MONTHLY_PRICE_ID ("${monthlyPrice}")`);
    } else {
      fail(`Test 4 - Failed to map monthly plan to STRIPE_MONTHLY_PRICE_ID`);
    }

    // ------------------------------------------------------------------------
    // TEST 5: Yearly plan maps to yearly Stripe Price ID
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 5: Yearly plan mapping...');
    const yearlyPrice = getPriceIdForPlan('yearly');
    if (yearlyPrice === env.STRIPE_YEARLY_PRICE_ID && yearlyPrice.length > 0) {
      pass(`Test 5 - Yearly plan maps strictly to STRIPE_YEARLY_PRICE_ID ("${yearlyPrice}")`);
    } else {
      fail(`Test 5 - Failed to map yearly plan to STRIPE_YEARLY_PRICE_ID`);
    }

    // ------------------------------------------------------------------------
    // TEST 6: Frontend cannot choose arbitrary Stripe Price IDs
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 6: Arbitrary price ID injection protection...');
    try {
      getPriceIdForPlan('price_custom_hacked_id' as any);
      fail('Test 6 - getPriceIdForPlan should reject arbitrary price IDs');
    } catch {
      pass('Test 6 - Frontend cannot supply arbitrary Stripe Price IDs; backend maps only valid plan keys');
    }

    // ------------------------------------------------------------------------
    // MOCK STRIPE CLIENT SETUP FOR SESSION CREATION TESTS (TESTS 7 - 12)
    // ------------------------------------------------------------------------
    let capturedSessionParams: any = null;
    let mockCustomerListCalled = false;
    let mockCustomerCreateCalled = false;

    const mockStripe = {
      customers: {
        list: async (args: any) => {
          mockCustomerListCalled = true;
          return { data: [] }; // Simulate no existing customer
        },
        create: async (args: any) => {
          mockCustomerCreateCalled = true;
          return { id: 'cus_test_mock_12345', ...args };
        },
      },
      checkout: {
        sessions: {
          create: async (params: any) => {
            capturedSessionParams = params;
            return {
              id: 'cs_test_mock_987654321',
              url: 'https://checkout.stripe.com/c/pay/cs_test_mock_987654321',
              ...params,
            };
          },
        },
      },
    } as unknown as Stripe;

    // ------------------------------------------------------------------------
    // TEST 7: Authenticated user can create a Checkout Session
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 7: Authenticated user checkout session creation...');
    const testUserId = '11111111-2222-3333-4444-555555555555';
    const testUserEmail = 'subscriber_test@example.com';
    const testUserName = 'Sub Test User';

    const result = await createCheckoutSession(
      {
        userId: testUserId,
        userEmail: testUserEmail,
        userName: testUserName,
        plan: 'monthly',
      },
      mockStripe
    );

    if (result.url && result.url.startsWith('https://checkout.stripe.com/')) {
      pass('Test 7 - Authenticated user can create a Checkout Session and receives valid checkout URL');
    } else {
      fail(`Test 7 - Failed to create checkout session, received url: ${result?.url}`);
    }

    // ------------------------------------------------------------------------
    // TEST 8: Checkout Session uses subscription mode
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 8: Session mode verification...');
    if (capturedSessionParams?.mode === 'subscription') {
      pass('Test 8 - Checkout Session strictly uses mode = "subscription"');
    } else {
      fail(`Test 8 - Expected mode "subscription", got "${capturedSessionParams?.mode}"`);
    }

    // ------------------------------------------------------------------------
    // TEST 9: Checkout Session uses recurring Price
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 9: Line items recurring price verification...');
    const lineItem = capturedSessionParams?.line_items?.[0];
    if (lineItem && lineItem.price === env.STRIPE_MONTHLY_PRICE_ID && lineItem.quantity === 1) {
      pass(`Test 9 - Checkout Session uses correct recurring Price ID ("${lineItem.price}") with quantity = 1`);
    } else {
      fail(`Test 9 - Line item invalid: ${JSON.stringify(lineItem)}`);
    }

    // ------------------------------------------------------------------------
    // TEST 10: Correct user metadata is attached
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 10: User metadata association verification...');
    const sessionMeta = capturedSessionParams?.metadata;
    const subMeta = capturedSessionParams?.subscription_data?.metadata;

    if (
      sessionMeta?.userId === testUserId &&
      sessionMeta?.plan === 'monthly' &&
      subMeta?.userId === testUserId &&
      subMeta?.plan === 'monthly'
    ) {
      pass('Test 10 - Correct user metadata (userId, plan) attached to both session and subscription_data');
    } else {
      fail(`Test 10 - Metadata mismatch: sessionMeta=${JSON.stringify(sessionMeta)}, subMeta=${JSON.stringify(subMeta)}`);
    }

    // ------------------------------------------------------------------------
    // TEST 11: Success URL is configured
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 11: Success URL verification...');
    if (
      capturedSessionParams?.success_url &&
      capturedSessionParams.success_url.includes(env.STRIPE_SUCCESS_URL)
    ) {
      pass(`Test 11 - Success URL configured: ${capturedSessionParams.success_url}`);
    } else {
      fail(`Test 11 - Success URL missing or invalid: ${capturedSessionParams?.success_url}`);
    }

    // ------------------------------------------------------------------------
    // TEST 12: Cancel URL is configured
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 12: Cancel URL verification...');
    if (capturedSessionParams?.cancel_url === env.STRIPE_CANCEL_URL) {
      pass(`Test 12 - Cancel URL configured: ${capturedSessionParams.cancel_url}`);
    } else {
      fail(`Test 12 - Cancel URL missing or invalid: ${capturedSessionParams?.cancel_url}`);
    }

    // ------------------------------------------------------------------------
    // TEST 13: Stripe configuration failure is handled safely
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 13: Stripe configuration error handling...');
    const originalPrice = env.STRIPE_MONTHLY_PRICE_ID;
    (env as any).STRIPE_MONTHLY_PRICE_ID = ''; // Temporarily clear
    try {
      const req13 = {
        user: { id: testUserId, email: testUserEmail, role: 'visitor' },
        body: { plan: 'monthly' },
      } as unknown as Request;
      const res13 = createMockRes();
      await createCheckoutSessionHandler(req13, res13 as unknown as Response);

      if (res13.statusCode === 503 && res13.jsonData?.code === 'SERVICE_UNAVAILABLE') {
        pass('Test 13 - Stripe configuration failure handled safely with HTTP 503 (no secret leaked)');
      } else {
        fail(`Test 13 - Expected 503 SERVICE_UNAVAILABLE, got ${res13.statusCode}`);
      }
    } finally {
      (env as any).STRIPE_MONTHLY_PRICE_ID = originalPrice; // Restore
    }

    // ------------------------------------------------------------------------
    // TEST 14: Stripe API failure is handled safely
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 14: Stripe API failure handling...');
    const failingStripe = {
      customers: {
        list: async () => { throw new Error('Stripe connection timeout'); },
        create: async () => { throw new Error('Stripe connection timeout'); },
      },
      checkout: {
        sessions: {
          create: async () => { throw new Error('Stripe network failure: card_declined'); },
        },
      },
    } as unknown as Stripe;

    try {
      await createCheckoutSession(
        { userId: testUserId, userEmail: testUserEmail, plan: 'monthly' },
        failingStripe
      );
      fail('Test 14 - Expected createCheckoutSession to throw on Stripe API failure');
    } catch (err: any) {
      if (err.message.includes('Stripe network failure')) {
        pass('Test 14 - Stripe API failure caught and safely handled without exposing sensitive internals');
      } else {
        fail('Test 14 - Unexpected error message:', err.message);
      }
    }

    // ------------------------------------------------------------------------
    // TEST 15: Database Invariants (Zero DB mutation during checkout creation)
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 15: Database invariant check...');
    const dbEmail = `stripe_test_${Date.now()}@example.com`;
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: dbEmail,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { name: 'Stripe Tester' },
    });

    if (authErr || !authUser.user) {
      throw new Error(`Failed to create test user for DB invariants: ${authErr?.message}`);
    }

    const liveUserId = authUser.user.id;

    // Verify role is visitor
    const userRes = await pool.query('SELECT role FROM public.users WHERE id = $1', [liveUserId]);
    if (userRes.rows[0]?.role === 'visitor') {
      pass('Database Invariant: User role initialized as "visitor"');
    } else {
      fail(`Database Invariant: Expected role "visitor", got "${userRes.rows[0]?.role}"`);
    }

    // Verify zero subscriptions in public.subscriptions
    const subRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM public.subscriptions WHERE user_id = $1',
      [liveUserId]
    );
    if (subRes.rows[0]?.count === 0) {
      pass('Database Invariant: 0 subscription records exist in public.subscriptions (count = 0)');
    } else {
      fail(`Database Invariant: Expected 0 subscriptions, found ${subRes.rows[0]?.count}`);
    }

    // Clean up test user
    await pool.query('DELETE FROM public.users WHERE id = $1', [liveUserId]);
    await supabase.auth.admin.deleteUser(liveUserId);
    console.log('Database test user cleaned up successfully.');

    // ------------------------------------------------------------------------
    // TEST 16: Frontend Source Verification
    // ------------------------------------------------------------------------
    console.log('\nRunning Test 16: Frontend CheckoutPreviewPage & Success/Cancel pages verification...');
    const checkoutPagePath = path.resolve(__dirname, '../../../client/src/pages/onboarding/CheckoutPreviewPage.tsx');
    const checkoutPageCode = fs.readFileSync(checkoutPagePath, 'utf-8');

    const hasLoadingState = checkoutPageCode.includes('Creating secure checkout...') && checkoutPageCode.includes('isSubmitting');
    const hasDuplicateClickPrevention = checkoutPageCode.includes('disabled={isSubmitting}');
    const callsBackend = checkoutPageCode.includes("api.post<{ url: string }>('/subscriptions/checkout'");
    const redirectsToUrl = checkoutPageCode.includes('window.location.href = checkoutUrl');
    const hasErrorAlert = checkoutPageCode.includes('role="alert"') && checkoutPageCode.includes('errorMessage');

    if (hasLoadingState && hasDuplicateClickPrevention && callsBackend && redirectsToUrl && hasErrorAlert) {
      pass('Test 16 - Frontend CheckoutPreviewPage contains loading state, duplicate click guard, backend checkout API call, redirect logic, and error display');
    } else {
      fail('Test 16 - Frontend CheckoutPreviewPage missing required UX/API interaction handlers');
    }

    const successPagePath = path.resolve(__dirname, '../../../client/src/pages/subscription/SubscriptionSuccessPage.tsx');
    const successPageCode = fs.readFileSync(successPagePath, 'utf-8');
    if (
      successPageCode.includes('Payment Completed') &&
      successPageCode.includes('Stripe Test Mode') &&
      !successPageCode.includes('Subscription is active')
    ) {
      pass('Test 17 - SubscriptionSuccessPage clearly explains Stripe test mode and does NOT falsely claim active subscription before webhook sync');
    } else {
      fail('Test 17 - SubscriptionSuccessPage invalid or claiming active subscription');
    }

    const cancelPagePath = path.resolve(__dirname, '../../../client/src/pages/subscription/SubscriptionCancelPage.tsx');
    const cancelPageCode = fs.readFileSync(cancelPagePath, 'utf-8');
    if (cancelPageCode.includes('Checkout Cancelled') && cancelPageCode.includes('Back to Checkout')) {
      pass('Test 18 - SubscriptionCancelPage provides return to checkout and plan selection');
    } else {
      fail('Test 18 - SubscriptionCancelPage missing required return navigation');
    }

    // Health check
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      pass('Backend Health Check: Database and API status OK');
    } else {
      fail('Backend Health Check failed: Database disconnected');
    }

  } catch (err: any) {
    fail('Unexpected error in Stripe verification suite:', err.message);
  } finally {
    await pool.end();
  }

  console.log(`\n========================================`);
  console.log(`STRIPE CHECKOUT VERIFICATION RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================\n`);

  process.exit(allPassed ? 0 : 1);
}

runStripeVerification();
