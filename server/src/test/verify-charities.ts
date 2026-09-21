/**
 * verify-charities.ts — Phase 3 Charity System Verification Suite
 *
 * Validates Steps 1 through 5:
 *   1. Charity data model & Admin CRUD (create, update, soft-delete, active filter).
 *   2. Public Charity Directory with search and category filtering.
 *   3. Individual Charity details and events structure.
 *   4. Homepage featured charity spotlight query.
 *   5. Subscriber charity selection & contribution percentage (10%–100% bounds).
 *   6. Independent mock donation creation and payment confirmation.
 *
 * Run: npm run test:charity
 */

import { pool } from '../config/database';
import {
  validateCharityInput,
  validateContributionPercentage,
  validateDonationInput,
} from '../utils/charity.validation';
import {
  createCharity,
  updateCharity,
  softDeleteCharity,
  getPublicCharities,
  getCharityById,
  getFeaturedCharities,
  updateSubscriptionCharityPreference,
  getSubscriptionCharityPreference,
  createDonation,
  confirmDonation,
  CharityServiceError,
} from '../services/charity.service';

let allPassed = true;

const pass = (msg: string) => console.log(`  ✓ PASS: ${msg}`);
const fail = (msg: string, err?: unknown) => {
  console.error(`  ✗ FAIL: ${msg}`, err instanceof Error ? err.message : (err || ''));
  allPassed = false;
};

const section = (title: string) => {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
};

const TEST_USER_ID = '00000000-0000-0000-0000-000000000088';
const TEST_USER_EMAIL = `test-charity-sub-${Date.now()}@example.com`;

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 3 — CHARITY SYSTEM VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════════════════════════');

  let testCharityId1 = '';
  let testCharityId2 = '';
  let testSubscriptionId = '';

  try {
    // ─── 1. Validation Logic ──────────────────────────────────────────────────
    section('1: Input Validation Rules');

    // Charity input validation
    const validCharity = validateCharityInput({
      name: 'Clean Oceans Foundation',
      category: 'Environment',
      description: 'Dedicated to removing plastic from the ocean',
      website_url: 'https://cleanoceans.example.org',
    });
    if (validCharity.valid && validCharity.data?.name === 'Clean Oceans Foundation') {
      pass('Valid charity input accepted with normalized category');
    } else {
      fail('Valid charity input was rejected', !validCharity.valid ? validCharity.error.message : '');
    }

    const invalidCategory = validateCharityInput({
      name: 'Invalid Charity',
      category: 'FakeCategory',
    });
    if (!invalidCategory.valid) {
      pass(`Invalid category 'FakeCategory' correctly rejected: "${invalidCategory.error.message}"`);
    } else {
      fail('Invalid category should have been rejected');
    }

    const emptyName = validateCharityInput({
      name: '',
      category: 'Education',
    });
    if (!emptyName.valid) {
      pass(`Empty charity name rejected: "${emptyName.error.message}"`);
    } else {
      fail('Empty name should have been rejected');
    }

    // Contribution percentage bounds (10% to 100%)
    const validPercents = [10, 25, 50, 75, 100];
    for (const p of validPercents) {
      const res = validateContributionPercentage(p);
      if (res.valid && res.percentage === p) {
        pass(`Valid contribution percentage accepted: ${p}%`);
      } else {
        fail(`Valid percentage ${p}% was rejected: ${!res.valid ? res.error.message : ''}`);
      }
    }

    const invalidPercents = [0, 5, 9, 101, -15];
    for (const p of invalidPercents) {
      const res = validateContributionPercentage(p);
      if (!res.valid) {
        pass(`Out-of-bounds percentage ${p}% correctly rejected: "${res.error.message}"`);
      } else {
        fail(`Out-of-bounds percentage ${p}% should have been rejected`);
      }
    }

    // Donation amount validation
    const validDonation = validateDonationInput({
      charity_id: '11111111-1111-1111-1111-111111111111',
      amount: 25.5,
    });
    if (validDonation.valid && validDonation.data?.amount === 25.5) {
      pass('Valid donation input accepted: $25.50');
    } else {
      fail('Valid donation input rejected', !validDonation.valid ? validDonation.error.message : '');
    }

    const zeroDonation = validateDonationInput({
      charity_id: '11111111-1111-1111-1111-111111111111',
      amount: 0,
    });
    if (!zeroDonation.valid) {
      pass(`Zero donation amount rejected: "${zeroDonation.error.message}"`);
    } else {
      fail('Zero donation amount should have been rejected');
    }

    // ─── 2. Admin Charity CRUD ───────────────────────────────────────────────
    section('2: Admin Charity CRUD & Soft Delete');

    // Create Charity 1
    const created1 = await createCharity({
      name: `Wildlife Sanctuary Alpha ${Date.now()}`,
      description: 'Preserving wild habitats and endangered species.',
      category: 'Environment',
      websiteUrl: 'https://wildlife-alpha.example.org',
      images: [],
      featured: true,
      upcomingEvents: [
        {
          title: 'Annual Benefit Gala',
          date: '2026-10-15',
          location: 'Grand Ballroom & Online',
        },
      ],
    });
    testCharityId1 = created1.id;
    pass(`Created active charity: ${created1.name} (ID: ${testCharityId1}, Featured: ${created1.featured})`);

    // Create Charity 2
    const created2 = await createCharity({
      name: `Youth Coding Academy ${Date.now()}`,
      description: 'Empowering underprivileged youth through technology education.',
      category: 'Education',
      websiteUrl: 'https://codeacademy.example.org',
      images: [],
      upcomingEvents: [],
      featured: false,
    });
    testCharityId2 = created2.id;
    pass(`Created second charity: ${created2.name} (ID: ${testCharityId2})`);

    // Update Charity 1
    const updated1 = await updateCharity(testCharityId1, {
      description: 'Updated description with expanded conservation initiatives.',
    });
    if (updated1.description.includes('expanded conservation')) {
      pass('Updated charity description successfully');
    } else {
      fail('Charity update failed to persist new description');
    }

    // Soft delete Charity 2
    const softDeleted = await softDeleteCharity(testCharityId2);
    if (!softDeleted.isActive && softDeleted.deletedAt !== null) {
      pass(`Soft-deleted charity ID ${testCharityId2}: is_active=false, deleted_at is set`);
    } else {
      fail('Soft delete did not properly set is_active=false or deleted_at');
    }

    // ─── 3. Public Directory Queries & Filtering ─────────────────────────────
    section('3: Public Directory Queries & Filtering');

    // Query all public charities
    const publicList = await getPublicCharities();
    const foundCharity1 = publicList.some((c) => c.id === testCharityId1);
    const foundCharity2 = publicList.some((c) => c.id === testCharityId2);

    if (foundCharity1 && !foundCharity2) {
      pass('Public list includes active charity and strictly excludes soft-deleted charity');
    } else {
      fail(`Filter failure: foundCharity1=${foundCharity1}, foundCharity2=${foundCharity2} (should be false)`);
    }

    // Category filtering
    const envCharities = await getPublicCharities({ category: 'Environment' });
    if (envCharities.every((c) => c.category === 'Environment') && envCharities.some((c) => c.id === testCharityId1)) {
      pass('Category filter correctly returned only Environment charities');
    } else {
      fail('Category filter failed');
    }

    // Search query
    const searchedCharities = await getPublicCharities({ search: 'Sanctuary Alpha' });
    if (searchedCharities.some((c) => c.id === testCharityId1)) {
      pass("Search query for 'Sanctuary Alpha' matched test charity");
    } else {
      fail('Search query failed to match test charity');
    }

    // Featured charities query
    const featured = await getFeaturedCharities();
    if (featured.some((c) => c.id === testCharityId1)) {
      pass('Featured charities list includes testCharityId1');
    } else {
      fail('Featured charities list missing testCharityId1');
    }

    // Individual charity profile retrieval
    const fetchedDetail = await getCharityById(testCharityId1);
    if (fetchedDetail && fetchedDetail.upcomingEvents.length === 1 && fetchedDetail.upcomingEvents[0].title === 'Annual Benefit Gala') {
      pass('Retrieved charity detail with structured upcoming events intact');
    } else {
      fail('Failed to retrieve structured charity detail');
    }

    // ─── 4. Subscriber Charity Selection & Contribution % ───────────────────
    section('4: Subscriber Charity Selection & Contribution Bounds');

    // Create test user and active subscription
    await pool.query(
      `INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
       VALUES ($1, $2, '{}', '{}', 'authenticated', 'authenticated')
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID, TEST_USER_EMAIL]
    );

    await pool.query(
      `INSERT INTO public.users (id, email, name, role, created_at, updated_at)
       VALUES ($1, $2, 'Test Subscriber', 'subscriber', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET role = 'subscriber'`,
      [TEST_USER_ID, TEST_USER_EMAIL]
    );

    const subRes = await pool.query(
      `INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at)
       VALUES ($1, 'monthly', 'active', NOW(), NOW() + INTERVAL '30 days')
       RETURNING id`,
      [TEST_USER_ID]
    );
    testSubscriptionId = subRes.rows[0].id;
    pass(`Setup test subscriber with subscription ID: ${testSubscriptionId}`);

    // Update preference to Charity 1 at 35%
    const prefResult = await updateSubscriptionCharityPreference(TEST_USER_ID, testCharityId1, 35);
    if (prefResult.charityId === testCharityId1 && prefResult.contributionPercentage === 35) {
      pass(`Updated charity preference to Charity 1 at 35% contribution`);
    } else {
      fail('Failed to update subscription charity preference');
    }

    // Read back preference
    const currentPref = await getSubscriptionCharityPreference(TEST_USER_ID);
    if (currentPref && currentPref.charityId === testCharityId1 && currentPref.charity?.name === created1.name) {
      pass('Read back current charity preference with joined charity metadata');
    } else {
      fail('Failed to retrieve active subscription charity preference');
    }

    // Verify rejection of inactive / soft-deleted charity
    try {
      await updateSubscriptionCharityPreference(TEST_USER_ID, testCharityId2, 20);
      fail('Selecting a soft-deleted charity should have thrown CharityServiceError');
    } catch (err: any) {
      if (err instanceof CharityServiceError && err.code === 'CHARITY_INACTIVE') {
        pass(`Correctly rejected soft-deleted charity: ${err.message}`);
      } else {
        fail('Wrong error type when selecting inactive charity', err);
      }
    }

    // Verify rejection of invalid contribution percentages
    try {
      await updateSubscriptionCharityPreference(TEST_USER_ID, testCharityId1, 5);
      fail('Setting contribution percentage < 10% should have thrown CharityServiceError');
    } catch (err: any) {
      if (err instanceof CharityServiceError && err.code === 'INVALID_PERCENTAGE') {
        pass(`Correctly rejected contribution < 10%: ${err.message}`);
      } else {
        fail('Wrong error type for invalid percentage', err);
      }
    }

    // ─── 5. Independent Mock Donation Flow ──────────────────────────────────
    section('5: Mock Donation Creation & Confirmation');

    // Create donation as authenticated subscriber
    const userDonation = await createDonation({
      user_id: TEST_USER_ID,
      charity_id: testCharityId1,
      amount: 50.0,
      donor_name: 'Jane Doe',
      message: 'Keep up the great work saving our planet!',
    });
    pass(`Initiated $50 donation (ID: ${userDonation.id}, Status: ${userDonation.status})`);

    // Confirm donation with successful mock card (4242)
    const confirmedDonation = await confirmDonation(userDonation.id, '4242424242424242');
    if (
      confirmedDonation.status === 'completed' &&
      confirmedDonation.transactionReference &&
      confirmedDonation.transactionReference.startsWith('MOCK-DON-')
    ) {
      pass(`Successfully confirmed donation with card 4242: Ref ${confirmedDonation.transactionReference}`);
    } else {
      fail('Mock donation confirmation with 4242 did not complete as expected');
    }

    // Test decline scenario with card 0002
    const failDonation = await createDonation({
      charity_id: testCharityId1,
      amount: 15.0,
      donor_name: 'Guest Donor',
    });

    try {
      await confirmDonation(failDonation.id, '4000000000000002');
      fail('Card ending in 0002 should have thrown payment decline');
    } catch (err: any) {
      if (err instanceof CharityServiceError && err.code === 'PAYMENT_DECLINED') {
        pass(`Correctly simulated card decline: ${err.message}`);
      } else {
        fail('Wrong error on mock decline', err);
      }
    }

    // Verify donation record was marked as failed
    const checkFailRes = await pool.query('SELECT status FROM public.donations WHERE id = $1', [failDonation.id]);
    if (checkFailRes.rows[0]?.status === 'failed') {
      pass('Declined donation status persisted as "failed" in database');
    } else {
      fail('Declined donation status was not updated to "failed"');
    }
  } catch (err) {
    fail('Unexpected error in charity verification suite', err);
  } finally {
    // ─── Cleanup Test Fixtures ────────────────────────────────────────────────
    try {
      if (testSubscriptionId) {
        await pool.query('DELETE FROM public.subscriptions WHERE id = $1', [testSubscriptionId]);
      }
      if (testCharityId1 || testCharityId2) {
        await pool.query('DELETE FROM public.donations WHERE charity_id IN ($1, $2)', [
          testCharityId1 || '00000000-0000-0000-0000-000000000000',
          testCharityId2 || '00000000-0000-0000-0000-000000000000',
        ]);
        await pool.query('DELETE FROM public.charities WHERE id IN ($1, $2)', [
          testCharityId1 || '00000000-0000-0000-0000-000000000000',
          testCharityId2 || '00000000-0000-0000-0000-000000000000',
        ]);
      }
      await pool.query('DELETE FROM public.users WHERE id = $1', [TEST_USER_ID]);
      await pool.query('DELETE FROM auth.users WHERE id = $1', [TEST_USER_ID]);
    } catch (cleanErr) {
      console.error('Error during cleanup:', cleanErr);
    }

    await pool.end();
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ALL PHASE 3 CHARITY TESTS PASSED ✓');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.error('  SOME PHASE 3 CHARITY TESTS FAILED ✗');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

run();
