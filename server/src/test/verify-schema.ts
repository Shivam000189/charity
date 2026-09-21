import { pool } from '../config/database';

async function runVerification() {
  const client = await pool.connect();
  console.log('--- STARTING STEP 4 DATABASE VERIFICATION ---');

  try {
    // 1. Check Tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r: any) => r.table_name);
    console.log('Tables found in public schema:', tables);

    const requiredTables = [
      'charities',
      'draw_entries',
      'draws',
      'payouts',
      'scores',
      'subscriptions',
      'users',
      'winners'
    ];

    const allTablesPresent = requiredTables.every(t => tables.includes(t));
    console.log('Test 1 - All 8 Tables Exist:', allTablesPresent ? 'PASS' : 'FAIL');

    // 2. Check Primary Keys
    const pkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name, c.data_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.columns c
        ON c.table_name = tc.table_name AND c.column_name = kcu.column_name AND c.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `);
    const pksValid = pkRes.rows.every((r: any) => r.column_name === 'id' && r.data_type === 'uuid');
    console.log('Test 2 - UUID Primary Keys on all tables:', pksValid ? 'PASS' : 'FAIL');

    // 3. Check Foreign Keys and Delete Actions
    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);

    // 4. Check Indexes
    const idxRes = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    const indexNames = idxRes.rows.map((r: any) => r.indexname);
    const hasRedundant = indexNames.some((name: string) => 
      ['idx_scores_user_id', 'idx_draw_entries_user_id', 'idx_winners_draw_id'].includes(name)
    );
    console.log('Test 3 - Redundant indexes omitted:', !hasRedundant ? 'PASS' : 'FAIL');

    const expectedIndexes = [
      'idx_subscriptions_user_id',
      'idx_subscriptions_user_active',
      'idx_draws_charity_id',
      'idx_draws_status_date',
      'idx_draw_entries_draw_id',
      'idx_winners_user_id',
      'idx_payouts_winner_id',
      'idx_payouts_status',
      'idx_users_email_lower'
    ];
    const allExpectedIndexesPresent = expectedIndexes.every(i => indexNames.includes(i));
    console.log('Test 4 - All approved indexes present:', allExpectedIndexesPresent ? 'PASS' : 'FAIL');

    // 5. Check Monetary Column Precision
    const moneyRes = await client.query(`
      SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name IN ('prize_amount', 'amount');
    `);
    const moneyValid = moneyRes.rows.every((r: any) => 
      r.data_type === 'numeric' && r.numeric_precision === 12 && r.numeric_scale === 2
    );
    console.log('Test 5 - Monetary precision is NUMERIC(12,2):', moneyValid ? 'PASS' : 'FAIL');

    // 6. Functional & Integrity Tests inside a rollback transaction with savepoints
    await client.query('BEGIN');
    console.log('Beginning transaction for constraint and behavioral tests...');

    // Setup dummy auth user in auth.users
    const testUserId = '00000000-0000-0000-0000-000000000001';
    await client.query(`
      INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
      VALUES ($1, 'test@example.com', '{}', '{}', 'authenticated', 'authenticated')
      ON CONFLICT (id) DO NOTHING;
    `, [testUserId]);

    // Update user created by auth trigger
    await client.query(`
      INSERT INTO public.users (id, email, name, role)
      VALUES ($1, 'Test@Example.COM', 'Test User', 'subscriber')
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role;
    `, [testUserId]);

    // Test email case-insensitive uniqueness
    let duplicateEmailFailed = false;
    await client.query('SAVEPOINT sp_email');
    try {
      const testUserId2 = '00000000-0000-0000-0000-000000000002';
      await client.query(`
        INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES ($1, 'test2@example.com', '{}', '{}', 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;
      `, [testUserId2]);

      // Attempt to set email to case-insensitive collision with test@example.com
      await client.query(`
        UPDATE public.users
        SET email = 'TEST@example.com'
        WHERE id = $1;
      `, [testUserId2]);
    } catch {
      duplicateEmailFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_email');
    }
    console.log('Test 6 - Case-insensitive email uniqueness:', duplicateEmailFailed ? 'PASS' : 'FAIL');

    // Test score insertion & duplicate score_date
    await client.query(`
      INSERT INTO public.scores (user_id, score, score_date)
      VALUES ($1, 100, '2026-09-21');
    `, [testUserId]);

    let duplicateScoreFailed = false;
    await client.query('SAVEPOINT sp_score');
    try {
      await client.query(`
        INSERT INTO public.scores (user_id, score, score_date)
        VALUES ($1, 200, '2026-09-21');
      `, [testUserId]);
    } catch {
      duplicateScoreFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_score');
    }
    console.log('Test 7 - One score per user per date:', duplicateScoreFailed ? 'PASS' : 'FAIL');

    // Test negative score rejected
    let negativeScoreFailed = false;
    await client.query('SAVEPOINT sp_neg_score');
    try {
      await client.query(`
        INSERT INTO public.scores (user_id, score, score_date)
        VALUES ($1, -10, '2026-09-22');
      `, [testUserId]);
    } catch {
      negativeScoreFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_neg_score');
    }
    console.log('Test 8 - Negative score check constraint:', negativeScoreFailed ? 'PASS' : 'FAIL');

    // Insert Charity
    const charityRes = await client.query(`
      INSERT INTO public.charities (name, description)
      VALUES ('Helpage Foundation', 'Support elderly care')
      RETURNING id;
    `);
    const charityId = charityRes.rows[0].id;

    // Test Draw with deadline after draw_date fails
    let invalidDeadlineFailed = false;
    await client.query('SAVEPOINT sp_deadline');
    try {
      await client.query(`
        INSERT INTO public.draws (name, charity_id, draw_date, entry_deadline, prize_amount)
        VALUES ('Invalid Draw', $1, '2026-09-21 12:00:00Z', '2026-09-21 13:00:00Z', 1000);
      `, [charityId]);
    } catch {
      invalidDeadlineFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_deadline');
    }
    console.log('Test 9 - Draw entry deadline <= draw_date constraint:', invalidDeadlineFailed ? 'PASS' : 'FAIL');

    // Insert valid Draw
    const drawRes = await client.query(`
      INSERT INTO public.draws (name, charity_id, draw_date, entry_deadline, prize_amount)
      VALUES ('Grand Diwali Draw', $1, '2026-10-31 18:00:00Z', '2026-10-31 17:00:00Z', 10000.00)
      RETURNING id, currency;
    `, [charityId]);
    const drawId = drawRes.rows[0].id;
    const defaultCurrency = drawRes.rows[0].currency;
    console.log('Test 10 - Default currency is INR:', defaultCurrency === 'INR' ? 'PASS' : 'FAIL');

    // Test invalid currency format fails
    let invalidCurrencyFailed = false;
    await client.query('SAVEPOINT sp_currency');
    try {
      await client.query(`
        INSERT INTO public.draws (name, charity_id, draw_date, entry_deadline, prize_amount, currency)
        VALUES ('Bad Currency Draw', $1, '2026-10-31 18:00:00Z', '2026-10-31 17:00:00Z', 10000.00, 'inr')
      `, [charityId]);
    } catch {
      invalidCurrencyFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_currency');
    }
    console.log('Test 11 - Currency 3-letter uppercase check:', invalidCurrencyFailed ? 'PASS' : 'FAIL');

    // Insert Draw Entry
    const entryRes = await client.query(`
      INSERT INTO public.draw_entries (draw_id, user_id)
      VALUES ($1, $2)
      RETURNING id;
    `, [drawId, testUserId]);
    const entryId = entryRes.rows[0].id;

    // Test duplicate Draw Entry fails
    let duplicateEntryFailed = false;
    await client.query('SAVEPOINT sp_entry');
    try {
      await client.query(`
        INSERT INTO public.draw_entries (draw_id, user_id)
        VALUES ($1, $2)
      `, [drawId, testUserId]);
    } catch {
      duplicateEntryFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_entry');
    }
    console.log('Test 12 - One draw entry per user per draw:', duplicateEntryFailed ? 'PASS' : 'FAIL');

    // Insert Winner
    await client.query(`
      INSERT INTO public.winners (draw_id, user_id, draw_entry_id, rank, prize_amount)
      VALUES ($1, $2, $3, 1, 10000.00);
    `, [drawId, testUserId, entryId]);

    // Test duplicate winner rank in draw fails
    let duplicateRankFailed = false;
    await client.query('SAVEPOINT sp_rank');
    try {
      const testUserId3 = '00000000-0000-0000-0000-000000000003';
      await client.query(`
        INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES ($1, 'test3@example.com', '{}', '{}', 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;
      `, [testUserId3]);
      await client.query(`
        INSERT INTO public.users (id, email, name) VALUES ($1, 'Test 3', 'User 3')
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;
      `, [testUserId3]);
      const entry3 = await client.query(`
        INSERT INTO public.draw_entries (draw_id, user_id) VALUES ($1, $2) RETURNING id;
      `, [drawId, testUserId3]);
      await client.query(`
        INSERT INTO public.winners (draw_id, user_id, draw_entry_id, rank, prize_amount)
        VALUES ($1, $2, $3, 1, 5000.00);
      `, [drawId, testUserId3, entry3.rows[0].id]);
    } catch {
      duplicateRankFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_rank');
    }
    console.log('Test 13 - Winner rank uniqueness per draw:', duplicateRankFailed ? 'PASS' : 'FAIL');

    // Test ON DELETE RESTRICT on user with draw entry / winner
    let deleteUserBlocked = false;
    await client.query('SAVEPOINT sp_del_user');
    try {
      await client.query(`DELETE FROM public.users WHERE id = $1`, [testUserId]);
    } catch {
      deleteUserBlocked = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_del_user');
    }
    console.log('Test 14 - ON DELETE RESTRICT on user with draw entry/winner:', deleteUserBlocked ? 'PASS' : 'FAIL');

    // Test Subscriptions single active invariant
    await client.query(`
      INSERT INTO public.subscriptions (user_id, plan, status, expires_at)
      VALUES ($1, 'monthly', 'active', now() + interval '30 days');
    `, [testUserId]);

    let duplicateActiveSubFailed = false;
    await client.query('SAVEPOINT sp_active_sub');
    try {
      await client.query(`
        INSERT INTO public.subscriptions (user_id, plan, status, expires_at)
        VALUES ($1, 'annual', 'active', now() + interval '365 days');
      `, [testUserId]);
    } catch {
      duplicateActiveSubFailed = true;
      await client.query('ROLLBACK TO SAVEPOINT sp_active_sub');
    }
    console.log('Test 15 - Single active subscription invariant:', duplicateActiveSubFailed ? 'PASS' : 'FAIL');

    // Rollback all test data
    await client.query('ROLLBACK');
    console.log('Transaction safely rolled back. Zero test data left in database.');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Verification error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runVerification();
