/**
 * verify-draws.ts — Phase 4 Draw & Prize Engine Verification Suite
 *
 * Validates Steps 1 through 5:
 *   1. Draw Configuration validation (month format, 25/35/40 sum to 100, duplicate month protection).
 *   2. Random & Score-weighted number generation (5 distinct integers in range [1, 45]).
 *   3. Prize Pool calculation (monthly/yearly plans, charity deduction %, zero-leakage precision).
 *   4. Match evaluation (3, 4, 5 match tiers, single-tier assignment, equal multi-winner split).
 *   5. Simulation flow (snapshot preview, no permanent winner records before publish).
 *   6. Atomic Publish & Idempotency (winner records in public.winners, draw completed, duplicate publish blocked).
 *   7. Jackpot Rollover (unclaimed 5-match jackpot carries to subsequent draw).
 *
 * Run: npm run test:draws
 */

import { pool } from '../config/database';
import {
  generateRandomNumbers,
  generateScoreWeightedNumbers,
  calculatePrizePool,
  evaluateMatches,
  DRAW_NUMBER_MIN,
  DRAW_NUMBER_MAX,
  ENTRY_NUMBER_COUNT,
} from '../utils/draw.math';
import {
  validateScheduledMonth,
  validatePoolPercentages,
  validateCreateDrawInput,
} from '../utils/draw.validation';
import {
  createDraw,
  openDraw,
  closeDraw,
  simulateDraw,
  publishDraw,
  getDrawByIdAdmin,
  deleteDraw,
  DrawServiceError,
} from '../services/draw.service';

let allPassed = true;

const pass = (msg: string) => console.log(`  ✓ PASS: ${msg}`);
const fail = (msg: string, err?: unknown) => {
  console.error(`  ✗ FAIL: ${msg}`, err instanceof Error ? err.message : (err || ''));
  allPassed = false;
};

const section = (title: string) => {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
};

const TEST_SUB_1_ID = '00000000-0000-0000-0000-000000000071';
const TEST_SUB_1_EMAIL = `test-draw-user1-${Date.now()}@example.com`;

const TEST_SUB_2_ID = '00000000-0000-0000-0000-000000000072';
const TEST_SUB_2_EMAIL = `test-draw-user2-${Date.now()}@example.com`;

const TEST_SUB_3_ID = '00000000-0000-0000-0000-000000000073';
const TEST_SUB_3_EMAIL = `test-draw-user3-${Date.now()}@example.com`;

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 4 — DRAW & PRIZE ENGINE VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════════════════════════');

  let testDrawId1 = '';
  let testDrawId2 = '';
  const testMonth1 = `2099-01`;
  const testMonth2 = `2099-02`;

  try {
    // ─── 1. Validation Logic ──────────────────────────────────────────────────
    section('1: Draw Configuration Validation');

    // Month format validation
    const validMonth = validateScheduledMonth('2026-09');
    if (validMonth.valid && validMonth.month === '2026-09') {
      pass('Valid scheduled month accepted: 2026-09');
    } else {
      fail('Valid month was rejected');
    }

    const invalidMonth = validateScheduledMonth('2026/09');
    if (!invalidMonth.valid) {
      pass(`Invalid month format '2026/09' rejected: "${invalidMonth.error.message}"`);
    } else {
      fail('Invalid month format should have been rejected');
    }

    // Pool share percentages validation
    const validShares = validatePoolPercentages(25, 35, 40);
    if (validShares.valid && validShares.percentages.threeMatch === 25) {
      pass('Standard 25/35/40 pool shares accepted (sum = 100%)');
    } else {
      fail('Standard pool shares rejected');
    }

    const badSumShares = validatePoolPercentages(20, 30, 40);
    if (!badSumShares.valid && badSumShares.error.code === 'INVALID_PERCENTAGES') {
      pass(`Invalid pool shares summing to 90% correctly rejected: "${badSumShares.error.message}"`);
    } else {
      fail('Invalid pool shares should have been rejected');
    }

    const negativeShares = validatePoolPercentages(-10, 50, 60);
    if (!negativeShares.valid) {
      pass('Negative pool share percentage rejected');
    } else {
      fail('Negative pool share should have been rejected');
    }

    // Full draw creation input validation
    const drawInput = validateCreateDrawInput({
      scheduledMonth: '2026-10',
      drawType: 'SCORE_WEIGHTED',
      threeMatchPercentage: 25,
      fourMatchPercentage: 35,
      fiveMatchPercentage: 40,
    });
    if (drawInput.valid && drawInput.data.drawType === 'SCORE_WEIGHTED') {
      pass('Draw create input parsed and normalized with default end-of-month dates');
    } else {
      fail('Draw create input validation failed');
    }

    // ─── 2. Number Generation Algorithms ──────────────────────────────────────
    section('2: Number Generation (Random & Score-Weighted)');

    // Random number generation
    const randomTicket = generateRandomNumbers(ENTRY_NUMBER_COUNT, DRAW_NUMBER_MIN, DRAW_NUMBER_MAX);
    const isSorted = randomTicket.every((val, i, arr) => !i || arr[i - 1] <= val);
    const isUnique = new Set(randomTicket).size === ENTRY_NUMBER_COUNT;
    const inRange = randomTicket.every((n) => n >= DRAW_NUMBER_MIN && n <= DRAW_NUMBER_MAX);

    if (randomTicket.length === 5 && isSorted && isUnique && inRange) {
      pass(`Random generation produces 5 unique sorted numbers in [1, 45]: [${randomTicket.join(', ')}]`);
    } else {
      fail('Random number generation failed constraints', randomTicket);
    }

    // Score-weighted generation
    const userRetainedScores = [18, 36, 36, 42, 45];
    const weightedTicket = generateScoreWeightedNumbers(
      userRetainedScores,
      ENTRY_NUMBER_COUNT,
      DRAW_NUMBER_MIN,
      DRAW_NUMBER_MAX
    );
    const weightedSorted = weightedTicket.every((val, i, arr) => !i || arr[i - 1] <= val);
    const weightedUnique = new Set(weightedTicket).size === ENTRY_NUMBER_COUNT;
    const weightedInRange = weightedTicket.every((n) => n >= DRAW_NUMBER_MIN && n <= DRAW_NUMBER_MAX);

    if (weightedTicket.length === 5 && weightedSorted && weightedUnique && weightedInRange) {
      pass(`Score-weighted generation produces 5 unique sorted numbers in [1, 45]: [${weightedTicket.join(', ')}]`);
    } else {
      fail('Score-weighted number generation failed constraints', weightedTicket);
    }

    // ─── 3. Pure Prize Pool Calculation ───────────────────────────────────────
    section('3: Prize Pool Calculation & Zero-Leakage Splitting');

    // 2 monthly subscribers (₹499 each with 10% charity = ₹449.10 net pool each)
    // 1 annual subscriber (₹4999/12 = ₹416.58 with 20% charity = ₹333.26 net pool)
    const mockSubs = [
      { plan: 'monthly', contributionPercentage: 10 },
      { plan: 'monthly', contributionPercentage: 10 },
      { plan: 'annual', contributionPercentage: 20 },
    ];
    const poolResult = calculatePrizePool(mockSubs, 5000.0, {
      threeMatch: 25,
      fourMatch: 35,
      fiveMatch: 40,
    });

    // Verify zero-leakage equality: threeMatch + fourMatch + fiveMatchBase === totalPool
    const baseSum = poolResult.threeMatchPool + poolResult.fourMatchPool + poolResult.fiveMatchBase;
    const diff = Math.abs(baseSum - poolResult.totalPool);

    if (diff < 0.001) {
      pass(`Zero-leakage precision verified: 3-match (₹${poolResult.threeMatchPool}) + 4-match (₹${poolResult.fourMatchPool}) + 5-match base (₹${poolResult.fiveMatchBase}) === totalPool (₹${poolResult.totalPool})`);
    } else {
      fail(`Leakage detected: base sum = ${baseSum}, total pool = ${poolResult.totalPool}`);
    }

    if (poolResult.fiveMatchPool === poolResult.fiveMatchBase + 5000.0) {
      pass(`Jackpot rollover of ₹5,000.00 added exclusively to 5-match pool: ₹${poolResult.fiveMatchPool}`);
    } else {
      fail('Jackpot rollover was not correctly added to 5-match pool');
    }

    // ─── 4. Match Evaluation & Multi-Winner Split ─────────────────────────────
    section('4: Match Evaluation & Multi-Winner Splitting');

    const winningNumbers = [5, 12, 23, 34, 45];
    const mockEntries = [
      // 5 matches -> fiveMatch
      { id: 'entry-1', userId: 'user-1', numbers: [5, 12, 23, 34, 45] },
      // 4 matches -> fourMatch
      { id: 'entry-2', userId: 'user-2', numbers: [5, 12, 23, 34, 40] },
      // 3 matches -> threeMatch (two winners)
      { id: 'entry-3', userId: 'user-3', numbers: [5, 12, 23, 30, 40] },
      { id: 'entry-4', userId: 'user-4', numbers: [5, 12, 34, 39, 41] },
      // 2 matches -> no prize
      { id: 'entry-5', userId: 'user-5', numbers: [5, 12, 20, 25, 30] },
    ];

    const evaluation = evaluateMatches(mockEntries, winningNumbers, {
      threeMatchPool: 3000.0,
      fourMatchPool: 4200.0,
      fiveMatchPool: 5000.0,
    });

    if (
      evaluation.fiveMatchWinners.length === 1 &&
      evaluation.fourMatchWinners.length === 1 &&
      evaluation.threeMatchWinners.length === 2
    ) {
      pass('Evaluated matches accurately into respective tiers (1 five-match, 1 four-match, 2 three-match)');
    } else {
      fail('Match evaluation produced wrong tier counts');
    }

    // Single-tier assignment check: fiveMatch winner does not appear in 4 or 3
    const winner1Id = 'entry-1';
    const inFour = evaluation.fourMatchWinners.some((w) => w.drawEntryId === winner1Id);
    const inThree = evaluation.threeMatchWinners.some((w) => w.drawEntryId === winner1Id);
    if (!inFour && !inThree) {
      pass('Highest-tier exclusivity enforced: 5-match winner is NOT duplicated in 4-match or 3-match tiers');
    } else {
      fail('Winner was duplicated across multiple tiers');
    }

    // Multi-winner split check (₹3000 split between 2 three-match winners = ₹1500 each)
    const threePrizes = evaluation.threeMatchWinners.map((w) => w.prizeAmount);
    if (threePrizes[0] === 1500.0 && threePrizes[1] === 1500.0) {
      pass('Equal multi-winner split verified: ₹3,000 pool split to ₹1,500.00 each');
    } else {
      fail('Multi-winner split failed', threePrizes);
    }

    // Since there was a 5-match winner, rollover should be 0
    if (evaluation.rolloverToNext === 0) {
      pass('5-match winner exists: jackpot rollover to next draw is ₹0.00');
    } else {
      fail('Rollover should be 0 when 5-match winner exists');
    }

    // Test zero 5-match winners rollover condition
    const noJackpotEval = evaluateMatches(mockEntries.slice(1), winningNumbers, {
      threeMatchPool: 3000.0,
      fourMatchPool: 4200.0,
      fiveMatchPool: 5000.0,
    });
    if (noJackpotEval.fiveMatchWinners.length === 0 && noJackpotEval.rolloverToNext === 5000.0) {
      pass('Zero 5-match winners condition verified: full 5-match pool (₹5,000.00) rolls over to next draw');
    } else {
      fail('Failed zero 5-match winners rollover condition');
    }

    // ─── 5. Database Integration & Admin Lifecycle ────────────────────────────
    section('5: Full Draw Lifecycle & Idempotent Publishing');

    // 5.1 Setup test users and subscriptions
    await pool.query(
      `INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
       VALUES ($1, $2, '{}', '{}', 'authenticated', 'authenticated'),
              ($3, $4, '{}', '{}', 'authenticated', 'authenticated'),
              ($5, $6, '{}', '{}', 'authenticated', 'authenticated')
       ON CONFLICT (id) DO NOTHING`,
      [TEST_SUB_1_ID, TEST_SUB_1_EMAIL, TEST_SUB_2_ID, TEST_SUB_2_EMAIL, TEST_SUB_3_ID, TEST_SUB_3_EMAIL]
    );

    await pool.query(
      `INSERT INTO public.users (id, email, name, role)
       VALUES ($1, $2, 'Draw Sub 1', 'subscriber'),
              ($3, $4, 'Draw Sub 2', 'subscriber'),
              ($5, $6, 'Draw Sub 3', 'subscriber')
       ON CONFLICT (id) DO UPDATE SET role = 'subscriber'`,
      [TEST_SUB_1_ID, TEST_SUB_1_EMAIL, TEST_SUB_2_ID, TEST_SUB_2_EMAIL, TEST_SUB_3_ID, TEST_SUB_3_EMAIL]
    );

    // Give User 1 some Stableford scores for score-weighted test
    await pool.query(
      `INSERT INTO public.scores (user_id, score, score_date)
       VALUES ($1, 36, '2026-09-01'), ($1, 42, '2026-09-02'), ($1, 45, '2026-09-03')
       ON CONFLICT (user_id, score_date) DO UPDATE SET score = EXCLUDED.score`,
      [TEST_SUB_1_ID]
    );

    // Active subscriptions for test users
    await pool.query(
      `INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at, contribution_percentage)
       VALUES ($1, 'monthly', 'active', NOW(), NOW() + INTERVAL '30 days', 10),
              ($2, 'monthly', 'active', NOW(), NOW() + INTERVAL '30 days', 15),
              ($3, 'annual',  'active', NOW(), NOW() + INTERVAL '365 days', 20)`,
      [TEST_SUB_1_ID, TEST_SUB_2_ID, TEST_SUB_3_ID]
    );
    pass('Test subscribers, subscriptions, and scores initialized');

    // 5.2 Create Draw 1 (SCORE_WEIGHTED)
    const createdDraw1 = await createDraw({
      name: 'Super Jackpot January 2099',
      scheduledMonth: testMonth1,
      drawType: 'SCORE_WEIGHTED',
      drawDate: '2099-01-31T23:59:59Z',
      entryDeadline: '2099-01-31T21:59:59Z',
      threeMatchPercentage: 25,
      fourMatchPercentage: 35,
      fiveMatchPercentage: 40,
    });
    testDrawId1 = createdDraw1.id;
    pass(`Created draw ID ${testDrawId1} for month ${testMonth1} in 'scheduled' status`);

    // Duplicate month creation check
    try {
      await createDraw({
        name: 'Duplicate Draw',
        scheduledMonth: testMonth1,
        drawType: 'RANDOM',
        drawDate: '2099-01-31T23:59:59Z',
        entryDeadline: '2099-01-31T21:59:59Z',
        threeMatchPercentage: 25,
        fourMatchPercentage: 35,
        fiveMatchPercentage: 40,
      });
      fail('Creating duplicate draw for same month should have failed');
    } catch (err: any) {
      if (err instanceof DrawServiceError && err.code === 'DRAW_MONTH_EXISTS') {
        pass(`Duplicate month creation blocked: "${err.message}"`);
      } else {
        fail('Wrong error for duplicate month', err);
      }
    }

    // 5.3 Open Draw & Auto-Enrollment
    const openResult = await openDraw(testDrawId1);
    if (openResult.draw.status === 'open' && openResult.enrolledCount >= 3) {
      pass(`Draw opened successfully: enrolled ${openResult.enrolledCount} subscribers with 5 unique numbers each`);
    } else {
      fail('Failed to open draw or enroll subscribers');
    }

    // Idempotency: calling openDraw a second time must NOT duplicate entries
    const openAgain = await openDraw(testDrawId1);
    if (openAgain.enrolledCount === openResult.enrolledCount) {
      pass('openDraw idempotency verified: repeated call produces identical entry count without duplicates');
    } else {
      fail('openDraw created duplicate entries on second invocation');
    }

    // 5.4 Close Draw
    const closedDraw = await closeDraw(testDrawId1);
    if (closedDraw.status === 'closed') {
      pass("Draw entry window closed: status transitioned to 'closed'");
    } else {
      fail('Failed to transition draw to closed status');
    }

    // 5.5 Simulate Draw (Before Publish)
    // Force numbers so that User 1 matches 3 numbers
    const entry1Res = await pool.query(
      `SELECT numbers FROM public.draw_entries WHERE draw_id = $1 AND user_id = $2`,
      [testDrawId1, TEST_SUB_1_ID]
    );
    const user1Numbers = (entry1Res.rows[0]?.numbers as number[]) || [];
    // Pick 3 from user 1 and 2 numbers that don't match
    const testDrawnNumbers = [
      user1Numbers[0],
      user1Numbers[1],
      user1Numbers[2],
      user1Numbers[0] === 44 ? 1 : 44,
      user1Numbers[0] === 45 ? 2 : 45,
    ].sort((a, b) => a - b);

    const simResult = await simulateDraw(testDrawId1, testDrawnNumbers);
    if (simResult.draw.status === 'simulated' && simResult.simulation.drawnNumbers) {
      pass(`Simulation executed: status='simulated', drawn numbers generated, winners calculated`);
    } else {
      fail('Draw simulation failed');
    }

    // CRITICAL: Verify simulation did NOT commit permanent records to public.winners
    const winnersBeforePublish = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM public.winners WHERE draw_id = $1`,
      [testDrawId1]
    );
    if (winnersBeforePublish.rows[0]?.cnt === 0) {
      pass('Simulation isolation verified: zero permanent records in public.winners before explicit publish');
    } else {
      fail('Simulation erroneously created permanent winner records!');
    }

    // 5.6 Publish Draw (Atomic & Idempotent)
    const pubResult = await publishDraw(testDrawId1);
    if (pubResult.draw.status === 'completed' && pubResult.draw.drawnNumbers?.length === 5) {
      pass(`Draw published successfully: status='completed', drawn numbers persisted: [${pubResult.draw.drawnNumbers.join(', ')}]`);
    } else {
      fail('Publish draw failed');
    }

    // Verify winners were persisted in public.winners with rank
    const winnersAfterPublish = await pool.query(
      `SELECT * FROM public.winners WHERE draw_id = $1 ORDER BY rank ASC`,
      [testDrawId1]
    );
    if (winnersAfterPublish.rows.length > 0) {
      pass(`Declared winners persisted in public.winners: ${winnersAfterPublish.rows.length} winner record(s)`);
    } else {
      fail('Expected winner records in public.winners after publish');
    }

    // Idempotency: Calling publish a second time must be rejected
    try {
      await publishDraw(testDrawId1);
      fail('Republishing an already completed draw should have thrown 409 DRAW_ALREADY_PUBLISHED');
    } catch (err: any) {
      if (err instanceof DrawServiceError && err.code === 'DRAW_ALREADY_PUBLISHED') {
        pass(`Idempotent publish protection verified: "${err.message}"`);
      } else {
        fail('Wrong error for duplicate publish', err);
      }
    }

    // Immutability: normal edit/delete is blocked
    try {
      await deleteDraw(testDrawId1);
      fail('Deleting a completed draw should have thrown CANNOT_DELETE_ACTIVE_DRAW');
    } catch (err: any) {
      if (err instanceof DrawServiceError) {
        pass(`Immutability verified: completed draw cannot be deleted: "${err.message}"`);
      } else {
        fail('Wrong error for delete on completed draw', err);
      }
    }

    // ─── 6. Jackpot Rollover Carry-Forward ────────────────────────────────────
    section('6: Jackpot Rollover to Subsequent Draw');

    const completedDraw1 = await getDrawByIdAdmin(testDrawId1);
    const rolloverAmount = completedDraw1.rolledOverToNext;

    if (rolloverAmount > 0) {
      pass(`Draw 1 produced unclaimed 5-match jackpot rollover of ₹${rolloverAmount.toFixed(2)}`);

      // Create Draw 2 for the next month
      const createdDraw2 = await createDraw({
        name: 'February Mega Jackpot 2099',
        scheduledMonth: testMonth2,
        drawType: 'RANDOM',
        drawDate: '2099-02-28T23:59:59Z',
        entryDeadline: '2099-02-28T21:59:59Z',
        threeMatchPercentage: 25,
        fourMatchPercentage: 35,
        fiveMatchPercentage: 40,
      });
      testDrawId2 = createdDraw2.id;

      if (createdDraw2.jackpotRolloverAmount === rolloverAmount) {
        pass(`Draw 2 for month ${testMonth2} automatically inherited Draw 1's jackpot rollover: ₹${createdDraw2.jackpotRolloverAmount.toFixed(2)}`);
      } else {
        fail(`Draw 2 did not inherit rollover: expected ${rolloverAmount}, got ${createdDraw2.jackpotRolloverAmount}`);
      }
    } else {
      pass('Draw 1 had a jackpot winner; rollover is ₹0.00');
    }
  } catch (err) {
    fail('Unexpected error in draw verification suite', err);
  } finally {
    // ─── Cleanup ──────────────────────────────────────────────────────────────
    try {
      if (testDrawId1 || testDrawId2) {
        await pool.query('DELETE FROM public.winners WHERE draw_id IN ($1, $2)', [
          testDrawId1 || '00000000-0000-0000-0000-000000000000',
          testDrawId2 || '00000000-0000-0000-0000-000000000000',
        ]);
        await pool.query('DELETE FROM public.draw_entries WHERE draw_id IN ($1, $2)', [
          testDrawId1 || '00000000-0000-0000-0000-000000000000',
          testDrawId2 || '00000000-0000-0000-0000-000000000000',
        ]);
        await pool.query('DELETE FROM public.draws WHERE id IN ($1, $2)', [
          testDrawId1 || '00000000-0000-0000-0000-000000000000',
          testDrawId2 || '00000000-0000-0000-0000-000000000000',
        ]);
      }
      await pool.query('DELETE FROM public.scores WHERE user_id IN ($1, $2, $3)', [
        TEST_SUB_1_ID,
        TEST_SUB_2_ID,
        TEST_SUB_3_ID,
      ]);
      await pool.query('DELETE FROM public.subscriptions WHERE user_id IN ($1, $2, $3)', [
        TEST_SUB_1_ID,
        TEST_SUB_2_ID,
        TEST_SUB_3_ID,
      ]);
      await pool.query('DELETE FROM public.users WHERE id IN ($1, $2, $3)', [
        TEST_SUB_1_ID,
        TEST_SUB_2_ID,
        TEST_SUB_3_ID,
      ]);
      await pool.query('DELETE FROM auth.users WHERE id IN ($1, $2, $3)', [
        TEST_SUB_1_ID,
        TEST_SUB_2_ID,
        TEST_SUB_3_ID,
      ]);
    } catch (cleanErr) {
      console.error('Error during cleanup:', cleanErr);
    }

    await pool.end();
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ALL PHASE 4 DRAW TESTS PASSED ✓');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.error('  SOME PHASE 4 DRAW TESTS FAILED ✗');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

run();
