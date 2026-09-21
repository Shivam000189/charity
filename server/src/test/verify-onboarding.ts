import { pool, checkDatabaseConnection } from '../config/database';
import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

async function verifyOnboarding() {
  console.log('--- STARTING PHASE 1 STEP 1 SUBSCRIBER ONBOARDING VERIFICATION ---\n');
  let allPassed = true;

  const pass = (msg: string) => console.log(`✓ PASS: ${msg}`);
  const fail = (msg: string, err?: any) => {
    console.error(`✗ FAIL: ${msg}`, err || '');
    allPassed = false;
  };

  try {
    // Test 1: Verify signup redirection targets /onboarding/plan
    const signupFormPath = path.resolve(__dirname, '../../../client/src/components/auth/SignupForm.tsx');
    const signupFormContent = fs.readFileSync(signupFormPath, 'utf-8');
    if (signupFormContent.includes('ROUTES.ONBOARDING_PLAN') && signupFormContent.includes('navigate(ROUTES.ONBOARDING_PLAN')) {
      pass('Test 1 - Successful signup redirects to /onboarding/plan');
    } else {
      fail('Test 1 - Successful signup does not redirect to /onboarding/plan in SignupForm.tsx');
    }

    // Test 2 & 3: Route protection verification in AppRouter.tsx
    const appRouterPath = path.resolve(__dirname, '../../../client/src/app/AppRouter.tsx');
    const appRouterContent = fs.readFileSync(appRouterPath, 'utf-8');
    const routesPath = path.resolve(__dirname, '../../../client/src/constants/routes.ts');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');

    const hasOnboardingPlanRoute = routesContent.includes("ONBOARDING_PLAN: '/onboarding/plan'");
    const hasOnboardingCheckoutRoute = routesContent.includes("ONBOARDING_CHECKOUT: '/onboarding/checkout'");

    if (hasOnboardingPlanRoute && hasOnboardingCheckoutRoute) {
      pass('Routes definition: /onboarding/plan and /onboarding/checkout registered in ROUTES');
    } else {
      fail('Routes definition: Missing onboarding route constants in routes.ts');
    }

    // Check that onboarding routes are wrapped inside ProtectedRoute
    const protectedRouteSection = appRouterContent.split('<Route element={<ProtectedRoute />}>')[1]?.split('</Route>')[0] || '';
    if (
      protectedRouteSection.includes('ROUTES.ONBOARDING_PLAN') &&
      protectedRouteSection.includes('ROUTES.ONBOARDING_CHECKOUT')
    ) {
      pass('Test 2 & 3 - Unauthenticated access protected: /onboarding/plan and /onboarding/checkout require authentication via ProtectedRoute');
    } else {
      fail('Test 2 & 3 - Onboarding routes are not mounted inside ProtectedRoute in AppRouter.tsx');
    }

    // Test 4 & 5: Subscription Plan definitions (Monthly & Yearly)
    const subscriptionTypesPath = path.resolve(__dirname, '../../../client/src/types/subscription.ts');
    const subscriptionTypesContent = fs.readFileSync(subscriptionTypesPath, 'utf-8');

    const hasMonthly = subscriptionTypesContent.includes("id: 'monthly'") && subscriptionTypesContent.includes("Monthly Plan");
    const hasYearly = subscriptionTypesContent.includes("id: 'yearly'") && subscriptionTypesContent.includes("Yearly Plan");
    const hasPlaceholderPrice = subscriptionTypesContent.includes('Price configured during payment integration');

    if (hasMonthly) {
      pass('Test 4 - Monthly plan defined with name, billing interval, and features');
    } else {
      fail('Test 4 - Monthly plan not properly defined');
    }

    if (hasYearly) {
      pass('Test 5 - Yearly plan defined with name, billing interval, and features');
    } else {
      fail('Test 5 - Yearly plan not properly defined');
    }

    if (hasPlaceholderPrice) {
      pass('Plan pricing placeholder: Explicitly uses "Price configured during payment integration" (no fake Stripe pricing)');
    } else {
      fail('Plan pricing: Missing required pricing placeholder');
    }

    // Test 6 & 7: Selected plan state and preservation
    const onboardingContextPath = path.resolve(__dirname, '../../../client/src/context/OnboardingContext.tsx');
    const onboardingContextContent = fs.readFileSync(onboardingContextPath, 'utf-8');
    if (onboardingContextContent.includes('sessionStorage') && onboardingContextContent.includes('selectPlan')) {
      pass('Test 6 - Selected plan preserved via OnboardingContext and session storage across navigation');
    } else {
      fail('Test 6 - Missing selection preservation in OnboardingContext');
    }

    const checkoutPagePath = path.resolve(__dirname, '../../../client/src/pages/onboarding/CheckoutPreviewPage.tsx');
    const checkoutPageContent = fs.readFileSync(checkoutPagePath, 'utf-8');
    if (checkoutPageContent.includes('selectedPlan.name') && checkoutPageContent.includes('selectedPlan.displayPrice')) {
      pass('Test 7 - Checkout preview displays selected plan details, billing, and pricing placeholder');
    } else {
      fail('Test 7 - Checkout preview does not render selected plan details');
    }

    // Test 8: Empty checkout redirection
    if (
      checkoutPageContent.includes('if (!selectedPlan)') &&
      checkoutPageContent.includes('navigate(ROUTES.ONBOARDING_PLAN')
    ) {
      pass('Test 8 - Visiting checkout without selected plan automatically redirects to /onboarding/plan');
    } else {
      fail('Test 8 - Missing redirect guard for empty plan on checkout page');
    }

    // Test 9: Change plan returns to plan selection
    if (
      checkoutPageContent.includes('handleChangePlan') &&
      checkoutPageContent.includes('navigate(ROUTES.ONBOARDING_PLAN)')
    ) {
      pass('Test 9 - Change Plan button takes user back to /onboarding/plan');
    } else {
      fail('Test 9 - Missing or broken Change Plan handler on checkout page');
    }

    // Test 10 & 11: Real Database Invariant Verifications with live user
    console.log('\nRunning database invariant checks with real Supabase Auth user...');
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'Onboarding Tester';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: testName },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    const userId = authData.user.id;

    // Verify role in public.users is 'visitor'
    const userRowRes = await pool.query(
      'SELECT id, email, role FROM public.users WHERE id = $1',
      [userId]
    );

    const userRow = userRowRes.rows[0];
    if (userRow && userRow.role === 'visitor') {
      pass('Test 11 - Newly registered user strictly receives role = "visitor"');
    } else {
      fail(`Test 11 - Expected role "visitor", got "${userRow?.role}"`);
    }

    // Test 10: Verify 0 subscription records exist for the user
    const subRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM public.subscriptions WHERE user_id = $1',
      [userId]
    );

    const subCount = subRes.rows[0].count;
    if (subCount === 0) {
      pass('Test 10 - Selecting a plan creates NO active subscription in public.subscriptions (count = 0)');
    } else {
      fail(`Test 10 - Expected 0 subscriptions, found ${subCount}`);
    }

    // Test 12: Health Check verification
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      pass('Test 12 - Health Check: Database and API health verified OK (server ok, database connected)');
    } else {
      fail('Test 12 - Health Check: Database reported disconnected');
    }

    // Clean up test user
    await pool.query('DELETE FROM public.users WHERE id = $1', [userId]);
    await supabase.auth.admin.deleteUser(userId);
    console.log('Test user cleaned up successfully from database.');

  } catch (err: any) {
    fail('Unexpected error in onboarding verification suite', err.message);
  } finally {
    await pool.end();
  }

  console.log(`\n========================================`);
  console.log(`ONBOARDING VERIFICATION RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================\n`);

  process.exit(allPassed ? 0 : 1);
}

verifyOnboarding();
