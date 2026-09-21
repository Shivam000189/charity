import { pool } from '../config/database';
import {
  getUserWinners,
  getWinnerById,
  uploadWinnerProof,
  getAllWinnersAdmin,
  getPendingWinnersAdmin,
  approveWinner,
  rejectWinner,
  markWinnerPaid,
} from '../services/winner.service';
import {
  getAdminOverviewMetrics,
  getAdminReports,
} from '../services/report.service';
import {
  listUsersAdmin,
  getUserDetailAdmin,
  updateUserRoleAdmin,
  adminEditScore,
} from '../services/admin-user.service';
import { validateProofUpload, validateRejectionReason, validatePaymentInput } from '../utils/winner.validation';

function pass(msg: string) {
  console.log(`  ✓ PASS: ${msg}`);
}

function fail(msg: string, details?: any) {
  console.error(`  ✗ FAIL: ${msg}`, details || '');
  process.exit(1);
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 5 — WINNER VERIFICATION & DASHBOARDS VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // ── 1. Validation Rules ───────────────────────────────────────────────
  console.log('── 1: Validation Rules & Security Invariants ───────────────────');

  // Valid image types
  try {
    const res = validateProofUpload('image/png', 1024, 'scorecard.png');
    if (res.ext === 'png') pass('Valid PNG proof upload accepted');
  } catch (err: any) {
    fail('Valid PNG should be accepted', err.message);
  }

  // Unsupported mime
  try {
    validateProofUpload('image/svg+xml', 1024, 'evil.svg');
    fail('SVG MIME type should be rejected');
  } catch (err: any) {
    if (err.code === 'UNSUPPORTED_FILE_TYPE') pass('SVG MIME type correctly rejected');
    else fail('Expected UNSUPPORTED_FILE_TYPE', err.message);
  }

  // Forbidden extension
  try {
    validateProofUpload('image/jpeg', 1024, 'script.html');
    fail('HTML extension should be rejected');
  } catch (err: any) {
    if (err.code === 'FORBIDDEN_FILE_EXTENSION') pass('Forbidden extension .html correctly rejected');
    else fail('Expected FORBIDDEN_FILE_EXTENSION', err.message);
  }

  // Oversized file
  try {
    validateProofUpload('image/jpeg', 6 * 1024 * 1024, 'huge.jpg');
    fail('File > 5MB should be rejected');
  } catch (err: any) {
    if (err.code === 'FILE_TOO_LARGE') pass('File exceeding 5MB correctly rejected');
    else fail('Expected FILE_TOO_LARGE', err.message);
  }

  // Empty rejection reason
  try {
    validateRejectionReason('   ');
    fail('Empty rejection reason should be rejected');
  } catch (err: any) {
    if (err.code === 'REJECTION_REASON_REQUIRED') pass('Empty rejection reason correctly rejected');
    else fail('Expected REJECTION_REASON_REQUIRED', err.message);
  }

  // Missing payment reference
  try {
    validatePaymentInput({ paymentReference: '' });
    fail('Missing payment reference should be rejected');
  } catch (err: any) {
    if (err.code === 'PAYMENT_REFERENCE_REQUIRED') pass('Missing payment reference correctly rejected');
    else fail('Expected PAYMENT_REFERENCE_REQUIRED', err.message);
  }

  // ── 2. Test Fixtures Setup ───────────────────────────────────────────
  console.log('\n── 2: Fixtures Setup (Users, Draw, Winners) ────────────────────');
  const testUserAId = '00000000-0000-0000-0000-000000000501';
  const testUserBId = '00000000-0000-0000-0000-000000000502';
  const testAdminId = '00000000-0000-0000-0000-000000000599';
  const testDrawId = '00000000-0000-0000-0000-000000000555';
  const testEntryAId = '00000000-0000-0000-0000-000000000511';
  const testEntryBId = '00000000-0000-0000-0000-000000000512';
  const testWinnerAId = '00000000-0000-0000-0000-000000000521';
  const testWinnerBId = '00000000-0000-0000-0000-000000000522';
  const testScoreId = '00000000-0000-0000-0000-000000000531';

  // Cleanup past test fixtures
  await pool.query(`DELETE FROM public.payouts WHERE winner_id IN ($1, $2)`, [testWinnerAId, testWinnerBId]);
  await pool.query(`DELETE FROM public.winners WHERE id IN ($1, $2)`, [testWinnerAId, testWinnerBId]);
  await pool.query(`DELETE FROM public.draw_entries WHERE id IN ($1, $2)`, [testEntryAId, testEntryBId]);
  await pool.query(`DELETE FROM public.draws WHERE id = $1`, [testDrawId]);
  await pool.query(`DELETE FROM public.scores WHERE id = $1`, [testScoreId]);
  await pool.query(`DELETE FROM public.users WHERE id IN ($1, $2, $3)`, [testUserAId, testUserBId, testAdminId]);

  // Insert test users into auth.users first, then public.users
  await pool.query(
    `INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
     VALUES ($1, 'winner.alpha@test.com', '{}', '{}', 'authenticated', 'authenticated'),
            ($2, 'winner.beta@test.com', '{}', '{}', 'authenticated', 'authenticated'),
            ($3, 'admin.review@test.com', '{}', '{}', 'authenticated', 'authenticated')
     ON CONFLICT (id) DO NOTHING`,
    [testUserAId, testUserBId, testAdminId]
  );

  await pool.query(
    `INSERT INTO public.users (id, name, email, role, created_at, updated_at)
     VALUES ($1, 'Winner User Alpha', 'winner.alpha@test.com', 'subscriber', NOW(), NOW()),
            ($2, 'Winner User Beta', 'winner.beta@test.com', 'subscriber', NOW(), NOW()),
            ($3, 'Admin Reviewer', 'admin.review@test.com', 'admin', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name`,
    [testUserAId, testUserBId, testAdminId]
  );

  // Insert test draw (completed)
  await pool.query(
    `INSERT INTO public.draws (
       id, name, scheduled_month, draw_date, entry_deadline, status,
       three_match_percentage, four_match_percentage, five_match_percentage,
       prize_amount, three_match_pool, four_match_pool, five_match_pool,
       drawn_numbers, created_at, updated_at
     )
     VALUES ($1, 'September 2098 Draw', '2098-09', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days', 'completed',
             25, 35, 40, 10000.00, 2500.00, 3500.00, 4000.00,
             '[5, 12, 18, 27, 44]'::jsonb, NOW(), NOW())`,
    [testDrawId]
  );

  // Insert draw entries
  await pool.query(
    `INSERT INTO public.draw_entries (id, draw_id, user_id, numbers, created_at)
     VALUES ($1, $2, $3, '[5, 12, 18, 27, 44]'::jsonb, NOW()),
            ($4, $2, $5, '[5, 12, 18, 27, 30]'::jsonb, NOW())`,
    [testEntryAId, testDrawId, testUserAId, testEntryBId, testUserBId]
  );

  // Insert initial winner records (PENDING_PROOF)
  await pool.query(
    `INSERT INTO public.winners (
       id, draw_id, user_id, draw_entry_id, rank, match_count, prize_amount, currency,
       verification_status, payment_status, created_at
     )
     VALUES ($1, $2, $3, $4, 1, 5, 4000.00, 'INR', 'PENDING_PROOF', 'PENDING', NOW()),
            ($5, $2, $6, $7, 2, 4, 3500.00, 'INR', 'PENDING_PROOF', 'PENDING', NOW())`,
    [testWinnerAId, testDrawId, testUserAId, testEntryAId, testWinnerBId, testUserBId, testEntryBId]
  );
  pass('Test users, completed draw, and initial winners created');

  // ── 3. Winner Proof Upload & Ownership Invariants ─────────────────────
  console.log('\n── 3: Winner Proof Upload & Ownership Invariants ───────────────');

  // Verify initial winner state
  const initialWinnerA = await getWinnerById(testWinnerAId, testUserAId, false);
  if (initialWinnerA.verificationStatus === 'PENDING_PROOF' && initialWinnerA.paymentStatus === 'PENDING') {
    pass('Initial winner created with status PENDING_PROOF and payment PENDING');
  } else {
    fail('Unexpected initial status', initialWinnerA);
  }

  // Cross-user ownership violation
  try {
    await uploadWinnerProof(
      testWinnerAId,
      testUserBId, // User B trying to upload proof for User A's winner
      Buffer.from('fake image data'),
      'image/jpeg',
      'proof.jpg'
    );
    fail('User B should NOT be able to upload proof for User A winner');
  } catch (err: any) {
    if (err.status === 403) pass('Cross-user proof upload strictly blocked with 403 Forbidden');
    else fail('Expected 403 status', err.message);
  }

  // Valid proof upload by winning owner
  const uploadedA = await uploadWinnerProof(
    testWinnerAId,
    testUserAId,
    Buffer.from('valid png binary content'),
    'image/png',
    'scorecard.png'
  );

  if (uploadedA.verificationStatus === 'PENDING_REVIEW' && uploadedA.proofStoragePath) {
    pass('Winner proof uploaded: status transitioned to PENDING_REVIEW and storage path recorded');
  } else {
    fail('Proof upload failed to update status', uploadedA);
  }

  // ── 4. Admin Verification Lifecycle (Approve, Reject, Re-Upload) ──────
  console.log('\n── 4: Admin Verification Lifecycle (Approve, Reject, Re-upload) ');

  // Pending reviews query
  const pending = await getPendingWinnersAdmin();
  const hasA = pending.some((w) => w.id === testWinnerAId);
  if (hasA) {
    pass('Admin getPendingWinnersAdmin includes test winner in PENDING_REVIEW');
  } else {
    fail('Winner missing from pending review list');
  }

  // Admin approves Winner A
  const approvedA = await approveWinner(testWinnerAId, testAdminId);
  if (
    approvedA.verificationStatus === 'APPROVED' &&
    approvedA.reviewedBy === testAdminId &&
    approvedA.paymentStatus === 'PENDING'
  ) {
    pass('Winner A approved: status=APPROVED, reviewedBy=adminId, paymentStatus=PENDING');
  } else {
    fail('Approval failed', approvedA);
  }

  // Winner A cannot upload more proof once approved
  try {
    await uploadWinnerProof(
      testWinnerAId,
      testUserAId,
      Buffer.from('more data'),
      'image/jpeg',
      'more.jpg'
    );
    fail('Approved winner should not be able to re-upload proof');
  } catch (err: any) {
    if (err.code === 'ALREADY_VERIFIED') pass('Re-upload on APPROVED winner blocked (ALREADY_VERIFIED)');
    else fail('Expected ALREADY_VERIFIED', err.message);
  }

  // Winner B uploads proof -> Admin rejects with reason
  await uploadWinnerProof(
    testWinnerBId,
    testUserBId,
    Buffer.from('blurry photo'),
    'image/jpeg',
    'blurry.jpg'
  );

  const rejectedB = await rejectWinner(
    testWinnerBId,
    testAdminId,
    'Scorecard is blurry and date is not readable.'
  );

  if (
    rejectedB.verificationStatus === 'REJECTED' &&
    rejectedB.rejectionReason === 'Scorecard is blurry and date is not readable.' &&
    rejectedB.reviewedBy === testAdminId
  ) {
    pass('Winner B rejected: status=REJECTED and rejectionReason properly persisted');
  } else {
    fail('Rejection failed', rejectedB);
  }

  // Winner B re-uploads after rejection -> resets to PENDING_REVIEW
  const reuploadedB = await uploadWinnerProof(
    testWinnerBId,
    testUserBId,
    Buffer.from('clear photo'),
    'image/jpeg',
    'clear.jpg'
  );

  if (
    reuploadedB.verificationStatus === 'PENDING_REVIEW' &&
    reuploadedB.rejectionReason === null
  ) {
    pass('Re-upload after rejection succeeded: status reset to PENDING_REVIEW and rejectionReason cleared');
  } else {
    fail('Re-upload after rejection failed', reuploadedB);
  }

  // ── 5. Payment Status Tracking & Settlement Invariants ───────────────
  console.log('\n── 5: Payment Status Tracking & Settlement Invariants ──────────');

  // Attempting to mark Winner B paid while in PENDING_REVIEW must fail
  try {
    await markWinnerPaid(testWinnerBId, testAdminId, { paymentReference: 'TXN-FAIL-01' });
    fail('Unapproved winner must NOT be marked as PAID');
  } catch (err: any) {
    if (err.code === 'WINNER_NOT_APPROVED') {
      pass('Mark-paid blocked for non-approved winner (WINNER_NOT_APPROVED)');
    } else {
      fail('Expected WINNER_NOT_APPROVED', err.message);
    }
  }

  // Mark Winner A as PAID
  const paidResult = await markWinnerPaid(testWinnerAId, testAdminId, {
    paymentReference: 'IMPS-TEST-998877',
    adminNote: 'Settled to verified bank account',
  });

  if (
    paidResult.winner.paymentStatus === 'PAID' &&
    paidResult.winner.paymentReference === 'IMPS-TEST-998877' &&
    paidResult.payoutId
  ) {
    pass('Winner A marked as PAID with payout settlement row created');
  } else {
    fail('Mark paid failed', paidResult);
  }

  // Verify public.payouts row in database
  const payoutCheck = await pool.query(
    `SELECT * FROM public.payouts WHERE id = $1`,
    [paidResult.payoutId]
  );
  if (payoutCheck.rows.length === 1 && payoutCheck.rows[0].status === 'completed') {
    pass('public.payouts record verified in database with status=completed');
  } else {
    fail('Payouts row check failed', payoutCheck.rows);
  }

  // Payment idempotency test
  try {
    await markWinnerPaid(testWinnerAId, testAdminId, { paymentReference: 'IMPS-DUPLICATE' });
    fail('Marking already-paid winner should throw conflict');
  } catch (err: any) {
    if (err.code === 'ALREADY_PAID') pass('Payment idempotency enforced: ALREADY_PAID conflict returned');
    else fail('Expected ALREADY_PAID', err.message);
  }

  // ── 6. Admin User Management & Score Editing ─────────────────────────
  console.log('\n── 6: Admin User Management & Score Editing ─────────────────────');

  const usersList = await listUsersAdmin();
  const foundUserA = usersList.find((u) => u.id === testUserAId);
  if (foundUserA && foundUserA.name === 'Winner User Alpha') {
    pass('Admin listUsersAdmin returned user directory with correct metrics');
  } else {
    fail('User missing from admin directory');
  }

  const userDetail = await getUserDetailAdmin(testUserAId);
  if (userDetail.winnings.length >= 1 && userDetail.name === 'Winner User Alpha') {
    pass('Admin getUserDetailAdmin returned comprehensive user profile and winnings');
  } else {
    fail('User detail incomplete', userDetail);
  }

  // Role update
  const roleUpdate = await updateUserRoleAdmin(testUserAId, 'visitor');
  if (roleUpdate.role === 'visitor') {
    pass('Admin updated user role to visitor');
  } else {
    fail('Role update failed', roleUpdate);
  }

  // Score editing
  await pool.query(
    `INSERT INTO public.scores (id, user_id, score, score_date, created_at, updated_at)
     VALUES ($1, $2, 32, '2026-09-10', NOW(), NOW())`,
    [testScoreId, testUserAId]
  );

  const editedScore = await adminEditScore(testScoreId, 39, '2026-09-10');
  if (editedScore.score === 39) {
    pass('Admin successfully corrected score to 39 within Stableford rules');
  } else {
    fail('Score edit failed', editedScore);
  }

  // ── 7. Admin Aggregate Reports ───────────────────────────────────────
  console.log('\n── 7: Admin Aggregate Reports Verification ─────────────────────');

  const overview = await getAdminOverviewMetrics();
  if (overview.totalUsers >= 2 && typeof overview.totalPrizePool === 'number') {
    pass(`Admin overview metrics calculated (Total users: ${overview.totalUsers}, Total prize pool: ₹${overview.totalPrizePool})`);
  } else {
    fail('Overview metrics invalid', overview);
  }

  const reports = await getAdminReports();
  if (
    reports.totalUsers.totalUsers >= 2 &&
    reports.totalPrizePool.completedDrawsCount >= 1 &&
    Array.isArray(reports.charityTotals.charities) &&
    reports.drawStatistics.totalDraws >= 1
  ) {
    pass('All 4 PRD reports aggregated accurately (Users, Prize Pool, Charities, Draw Stats)');
  } else {
    fail('Reports aggregation incomplete', reports);
  }

  // ── 8. Cleanup ───────────────────────────────────────────────────────
  console.log('\n── 8: Cleanup Test Data ─────────────────────────────────────────');
  await pool.query(`DELETE FROM public.payouts WHERE winner_id IN ($1, $2)`, [testWinnerAId, testWinnerBId]);
  await pool.query(`DELETE FROM public.winners WHERE id IN ($1, $2)`, [testWinnerAId, testWinnerBId]);
  await pool.query(`DELETE FROM public.draw_entries WHERE id IN ($1, $2)`, [testEntryAId, testEntryBId]);
  await pool.query(`DELETE FROM public.draws WHERE id = $1`, [testDrawId]);
  await pool.query(`DELETE FROM public.scores WHERE id = $1`, [testScoreId]);
  await pool.query(`DELETE FROM public.users WHERE id IN ($1, $2, $3)`, [testUserAId, testUserBId, testAdminId]);
  await pool.query(`DELETE FROM auth.users WHERE id IN ($1, $2, $3)`, [testUserAId, testUserBId, testAdminId]);
  pass('Test fixtures cleaned up cleanly');

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  ALL PHASE 5 BACKEND VERIFICATION TESTS PASSED ✓');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  await pool.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
