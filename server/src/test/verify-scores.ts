/**
 * verify-scores.ts — Phase 2 Score Management Verification Suite
 *
 * Validates Steps 1 through 5:
 *   1. Score validation (Stableford 1–45, calendar date YYYY-MM-DD, no future dates).
 *   2. One score per date constraint & SCORE_ALREADY_EXISTS structured 409 handling.
 *   3. Rolling-5 atomic eviction (inserting 6th score evicts oldest by score_date, created_at).
 *   4. Edit and Delete with strict ownership enforcement (User B cannot edit/delete User A's scores).
 *   5. Clean error handling & data isolation between users.
 *
 * Run: npm run test:scores
 */

import { pool } from '../config/database';
import {
  validateScoreValue,
  validateScoreDate,
  validateScoreInput,
} from '../utils/score.validation';
import {
  saveScore,
  getUserScores,
  updateScore,
  deleteScore,
  ScoreServiceError,
} from '../services/score.service';

let allPassed = true;

const pass = (msg: string) => console.log(`  ✓ PASS: ${msg}`);
const fail = (msg: string, err?: unknown) => {
  console.error(`  ✗ FAIL: ${msg}`, err instanceof Error ? err.message : (err || ''));
  allPassed = false;
};

const section = (title: string) => {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
};

const USER_A_ID = '00000000-0000-0000-0000-000000000091';
const USER_A_EMAIL = `test-score-a-${Date.now()}@example.com`;

const USER_B_ID = '00000000-0000-0000-0000-000000000092';
const USER_B_EMAIL = `test-score-b-${Date.now()}@example.com`;

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 2 — SCORE MANAGEMENT VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════════════════════════');

  try {
    // ─── 1. Validation Logic ──────────────────────────────────────────────────
    section('1: Stableford Score & Date Validation');

    // Score validation (1-45 integer)
    const validScores = [1, 18, 36, 45];
    for (const s of validScores) {
      const res = validateScoreValue(s);
      if (res.valid && res.score === s) {
        pass(`Valid score accepted: ${s}`);
      } else {
        fail(`Valid score rejected: ${s}`);
      }
    }

    const invalidScores = [0, -1, 46, 100, 36.5, 'abc', null, undefined];
    for (const s of invalidScores) {
      const res = validateScoreValue(s);
      if (!res.valid) {
        pass(`Invalid score rejected correctly: ${s} (${res.error.code})`);
      } else {
        fail(`Invalid score was accepted: ${s}`);
      }
    }

    // Date validation (YYYY-MM-DD, no future)
    const todayStr = new Date().toISOString().slice(0, 10);
    const validDateRes = validateScoreDate(todayStr);
    if (validDateRes.valid && validDateRes.date === todayStr) {
      pass(`Valid today date accepted: ${todayStr}`);
    } else {
      fail(`Valid today date rejected: ${todayStr}`);
    }

    const pastDateRes = validateScoreDate('2024-01-15');
    if (pastDateRes.valid && pastDateRes.date === '2024-01-15') {
      pass(`Valid past date accepted: 2024-01-15`);
    } else {
      fail(`Valid past date rejected: 2024-01-15`);
    }

    // Future date
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
    const futureDateRes = validateScoreDate(tomorrow);
    if (!futureDateRes.valid && futureDateRes.error.code === 'FUTURE_DATE') {
      pass(`Future date rejected: ${tomorrow} (${futureDateRes.error.code})`);
    } else {
      fail(`Future date was accepted or had wrong code: ${tomorrow}`);
    }

    // Malformed dates
    const malformed = ['2026-02-30', 'not-a-date', '2026/05/01', ''];
    for (const d of malformed) {
      const res = validateScoreDate(d);
      if (!res.valid) {
        pass(`Malformed date rejected: "${d}" (${res.error.code})`);
      } else {
        fail(`Malformed date was accepted: "${d}"`);
      }
    }

    // ─── 2. Database Setup for Users ──────────────────────────────────────────
    section('2: Database Setup & Teardown Verification');

    await pool.query(
      `INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
       VALUES ($1, $2, '{}', '{}', 'authenticated', 'authenticated'),
              ($3, $4, '{}', '{}', 'authenticated', 'authenticated')
       ON CONFLICT (id) DO NOTHING`,
      [USER_A_ID, USER_A_EMAIL, USER_B_ID, USER_B_EMAIL]
    );

    await pool.query(
      `INSERT INTO public.users (id, email, name, role, created_at, updated_at)
       VALUES ($1, $2, 'Score User A', 'subscriber', NOW(), NOW()),
              ($3, $4, 'Score User B', 'subscriber', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [USER_A_ID, USER_A_EMAIL, USER_B_ID, USER_B_EMAIL]
    );

    // Clean up any existing scores for these test users
    await pool.query(`DELETE FROM public.scores WHERE user_id IN ($1, $2)`, [USER_A_ID, USER_B_ID]);
    pass('Test users initialized and existing scores wiped');

    // ─── 3. Basic Score Insertion & Retrieval ─────────────────────────────────
    section('3: Score Insertion & Retrieval (Step 1)');

    const insertResult = await saveScore({
      userId: USER_A_ID,
      score: 36,
      date: '2026-09-01',
    });

    if (insertResult.score && insertResult.score.score === 36 && insertResult.score.date === '2026-09-01') {
      pass(`Score successfully inserted: score=36, date=2026-09-01, id=${insertResult.score.id}`);
    } else {
      fail(`Score insert result unexpected: ${JSON.stringify(insertResult)}`);
    }

    const fetchedScores = await getUserScores(USER_A_ID);
    if (fetchedScores.length === 1 && fetchedScores[0].id === insertResult.score.id) {
      pass(`getUserScores returned 1 score matching inserted ID`);
    } else {
      fail(`getUserScores returned unexpected count: ${fetchedScores.length}`);
    }

    // ─── 4. Enforce One Score Per Date (Step 2) ───────────────────────────────
    section('4: One Score Per Date Enforcement (Step 2)');

    let duplicateThrewExpected = false;
    try {
      await saveScore({
        userId: USER_A_ID,
        score: 40,
        date: '2026-09-01', // Same date as first score
      });
    } catch (err: any) {
      if (
        err instanceof ScoreServiceError &&
        err.code === 'SCORE_ALREADY_EXISTS' &&
        err.statusCode === 409 &&
        err.extra?.existingScoreId === insertResult.score.id
      ) {
        duplicateThrewExpected = true;
        pass(`Duplicate date rejected with 409 SCORE_ALREADY_EXISTS and existingScoreId`);
      } else {
        fail(`Duplicate threw unexpected error:`, err);
      }
    }

    if (!duplicateThrewExpected) {
      fail(`Duplicate date did not throw SCORE_ALREADY_EXISTS!`);
    }

    // Verify User B CAN insert a score on the same date (2026-09-01)
    const userBScore = await saveScore({
      userId: USER_B_ID,
      score: 42,
      date: '2026-09-01',
    });
    if (userBScore.score && userBScore.score.score === 42) {
      pass(`Different user (User B) successfully logged score on same date: 2026-09-01`);
    } else {
      fail(`User B failed to log score on 2026-09-01`);
    }

    // ─── 5. Rolling-5 Atomic Eviction (Step 3) ────────────────────────────────
    section('5: Rolling-5 Atomic Eviction (Step 3)');

    // User A currently has 1 score (2026-09-01).
    // Let's insert 4 more scores so User A reaches 5 scores total:
    // Dates: 2026-09-02, 2026-09-03, 2026-09-04, 2026-09-05
    const scoreDates = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'];
    for (let i = 0; i < scoreDates.length; i++) {
      await saveScore({
        userId: USER_A_ID,
        score: 30 + i * 2,
        date: scoreDates[i],
      });
    }

    const fiveScores = await getUserScores(USER_A_ID);
    if (fiveScores.length === 5) {
      pass(`User A now has exactly 5 retained scores`);
    } else {
      fail(`Expected 5 scores, found: ${fiveScores.length}`);
    }

    // Oldest score is 2026-09-01 (insertResult.score.id)
    const oldestBefore = fiveScores[fiveScores.length - 1]; // reverse chronological order: last is oldest
    if (oldestBefore.date === '2026-09-01' && oldestBefore.id === insertResult.score.id) {
      pass(`Verified oldest score before eviction is 2026-09-01 (id: ${insertResult.score.id})`);
    } else {
      fail(`Oldest score date mismatch: expected 2026-09-01, found ${oldestBefore.date}`);
    }

    // Now insert a 6th score: 2026-09-06
    const sixthResult = await saveScore({
      userId: USER_A_ID,
      score: 44,
      date: '2026-09-06',
    });

    if (sixthResult.evictedScoreId === insertResult.score.id) {
      pass(`Atomic eviction triggered: evictedScoreId matches oldest score (${insertResult.score.id})`);
    } else {
      fail(`Expected evictedScoreId ${insertResult.score.id}, got ${sixthResult.evictedScoreId}`);
    }

    const scoresAfterEviction = await getUserScores(USER_A_ID);
    if (scoresAfterEviction.length === 5) {
      pass(`User A total scores remained capped at 5 after 6th insertion`);
    } else {
      fail(`Expected capped count 5, got ${scoresAfterEviction.length}`);
    }

    const hasEvictedDate = scoresAfterEviction.some((s) => s.date === '2026-09-01');
    if (!hasEvictedDate) {
      pass(`Oldest score 2026-09-01 is confirmed evicted from database`);
    } else {
      fail(`Oldest score 2026-09-01 is still present in database!`);
    }

    // Verify User B's score was NOT touched by User A's eviction
    const userBScores = await getUserScores(USER_B_ID);
    if (userBScores.length === 1 && userBScores[0].id === userBScore.score.id) {
      pass(`User B's score on 2026-09-01 is completely untouched (cross-user isolation)`);
    } else {
      fail(`User B's score was modified or deleted!`);
    }

    // ─── 6. Edit & Delete with Ownership Enforcement (Step 4) ─────────────────
    section('6: Edit & Delete with Ownership Enforcement (Step 4)');

    const targetScore = scoresAfterEviction[0]; // newest score (2026-09-06, score 44)

    // User A updates their own score value to 45
    const updated = await updateScore({
      userId: USER_A_ID,
      scoreId: targetScore.id,
      score: 45,
    });

    if (updated.score.score === 45 && updated.score.date === targetScore.date) {
      pass(`User A successfully updated score to 45`);
    } else {
      fail(`Score update failed: ${JSON.stringify(updated)}`);
    }

    // Editing does NOT trigger rolling-5 eviction
    const countAfterEdit = await getUserScores(USER_A_ID);
    if (countAfterEdit.length === 5) {
      pass(`Editing existing score did NOT trigger eviction (count remains 5)`);
    } else {
      fail(`Count changed after edit: ${countAfterEdit.length}`);
    }

    // User A attempts to change date to another existing date of User A
    let updateCollisionThrew = false;
    try {
      await updateScore({
        userId: USER_A_ID,
        scoreId: targetScore.id,
        date: '2026-09-02', // Already taken by another score of User A
      });
    } catch (err: any) {
      if (err instanceof ScoreServiceError && err.code === 'SCORE_ALREADY_EXISTS') {
        updateCollisionThrew = true;
        pass(`Date collision during update correctly rejected with SCORE_ALREADY_EXISTS`);
      } else {
        fail(`Update date collision threw unexpected error:`, err);
      }
    }
    if (!updateCollisionThrew) {
      fail(`Updating date to existing date did not throw error!`);
    }

    // User B attempts to edit User A's score -> must fail with SCORE_NOT_FOUND (404)
    let crossEditBlocked = false;
    try {
      await updateScore({
        userId: USER_B_ID,
        scoreId: targetScore.id,
        score: 10,
      });
    } catch (err: any) {
      if (err instanceof ScoreServiceError && err.code === 'SCORE_NOT_FOUND') {
        crossEditBlocked = true;
        pass(`Cross-user edit blocked: User B cannot edit User A's score (${err.code})`);
      } else {
        fail(`Cross-user edit threw unexpected error:`, err);
      }
    }
    if (!crossEditBlocked) {
      fail(`User B was able to edit User A's score!`);
    }

    // User B attempts to delete User A's score -> must fail with SCORE_NOT_FOUND (404)
    let crossDeleteBlocked = false;
    try {
      await deleteScore(USER_B_ID, targetScore.id);
    } catch (err: any) {
      if (err instanceof ScoreServiceError && err.code === 'SCORE_NOT_FOUND') {
        crossDeleteBlocked = true;
        pass(`Cross-user delete blocked: User B cannot delete User A's score (${err.code})`);
      } else {
        fail(`Cross-user delete threw unexpected error:`, err);
      }
    }
    if (!crossDeleteBlocked) {
      fail(`User B was able to delete User A's score!`);
    }

    // User A deletes their own score
    const deleteResult = await deleteScore(USER_A_ID, targetScore.id);
    if (deleteResult.deletedId === targetScore.id && deleteResult.scores.length === 4) {
      pass(`User A successfully deleted score; remaining scores count = 4`);
    } else {
      fail(`Score deletion result unexpected: ${JSON.stringify(deleteResult)}`);
    }

    // ─── 7. Cleanup ───────────────────────────────────────────────────────────
    section('7: Cleanup');
    await pool.query(`DELETE FROM public.scores WHERE user_id IN ($1, $2)`, [USER_A_ID, USER_B_ID]);
    await pool.query(`DELETE FROM public.users WHERE id IN ($1, $2)`, [USER_A_ID, USER_B_ID]);
    await pool.query(`DELETE FROM auth.users WHERE id IN ($1, $2)`, [USER_A_ID, USER_B_ID]);
    pass('Test data cleanly removed');

  } catch (err) {
    fail('Unexpected exception during verification suite', err);
  } finally {
    console.log('\n═══════════════════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('  ✅ ALL TESTS PASSED — Phase 2 Score Management Verified');
    } else {
      console.error('  ❌ SOME TESTS FAILED');
      process.exitCode = 1;
    }
    console.log('═══════════════════════════════════════════════════════════════════\n');
    await pool.end();
  }
}

run();
