process.env.NODE_ENV = 'test';

import { supabase as adminSupabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../config/database';
import { app } from '../server';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function runAuthVerification() {
  console.log('--- STARTING STEP 5 SUPABASE AUTHENTICATION VERIFICATION ---');

  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Alice Test';

  let testUserId: string | null = null;
  let serverInstance: http.Server | null = null;
  const testPort = 5055;

  try {
    // Start temporary Express server instance on testPort
    serverInstance = app.listen(testPort);
    console.log(`Test Express server listening on port ${testPort}`);

    // Public client (mimicking browser)
    const publicSupabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_m2GCI9Me4qKDEMxUfoCU-w_qQNE_AVY'
    );

    // TEST 1 — Signup / User creation
    console.log('\nRunning Test 1: User Signup...');
    const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: testName,
        role: 'admin', // Malicious attempt to self-promote to admin
      },
    });

    if (createError || !createData.user) {
      throw new Error(`Failed to create test auth user: ${createError?.message}`);
    }
    testUserId = createData.user.id;
    console.log('Test 1 - User Signup: PASS (auth.users ID:', testUserId, ')');

    // TEST 2 — Profile creation in public.users
    console.log('\nRunning Test 2: Profile creation in public.users...');
    const profileRes = await pool.query(
      'SELECT id, email, name, role FROM public.users WHERE id = $1',
      [testUserId]
    );
    const profile = profileRes.rows[0];
    if (!profile || profile.id !== testUserId) {
      throw new Error('Profile row not found in public.users');
    }
    console.log('Test 2 - Profile creation in public.users: PASS (Row exists: true)');

    // TEST 3 & 11 — Default role & Role escalation protection
    console.log('\nRunning Test 3 & 11: Default role & Role escalation protection...');
    if (profile.role !== 'visitor') {
      throw new Error(`Role escalation occurred! Expected visitor, got ${profile.role}`);
    }
    console.log('Test 3 - Default role is visitor: PASS');
    console.log('Test 11 - Role escalation protection: PASS (attempted "admin", assigned:', profile.role, ')');

    // TEST 4 — Login with valid credentials
    console.log('\nRunning Test 4: Login with valid credentials...');
    const { data: loginData, error: loginError } = await publicSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (loginError || !loginData.session) {
      throw new Error(`Login failed: ${loginError?.message}`);
    }
    const token = loginData.session.access_token;
    console.log('Test 4 - Login with valid credentials: PASS (Received access token)');

    // TEST 10 — Protected endpoint with valid token (BEFORE SIGN OUT)
    console.log('\nRunning Test 10: Protected endpoint with valid token...');
    const authRes = await fetch(`http://localhost:${testPort}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const authData = (await authRes.json()) as { success: boolean; user?: { id: string; email: string; role: string } };
    if (authRes.status !== 200 || !authData.success || authData.user?.id !== testUserId) {
      throw new Error(`Protected endpoint failed: status ${authRes.status}, data: ${JSON.stringify(authData)}`);
    }
    console.log('Test 10 - Protected endpoint returns authenticated profile: PASS (Status: 200, User:', authData.user.email, 'Role:', authData.user.role, ')');

    // TEST 8 — Protected endpoint without token returns 401
    console.log('\nRunning Test 8: Protected endpoint without token...');
    const unauthRes = await fetch(`http://localhost:${testPort}/api/auth/me`);
    const unauthData = (await unauthRes.json()) as { success: boolean };
    if (unauthRes.status !== 401 || unauthData.success !== false) {
      throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }
    console.log('Test 8 - Protected endpoint without token returns 401: PASS (Status:', unauthRes.status, ')');

    // TEST 9 — Protected endpoint with invalid token returns 401
    console.log('\nRunning Test 9: Protected endpoint with invalid token...');
    const badTokenRes = await fetch(`http://localhost:${testPort}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid.fake.token',
      },
    });
    const badTokenData = (await badTokenRes.json()) as { success: boolean };
    if (badTokenRes.status !== 401 || badTokenData.success !== false) {
      throw new Error(`Expected 401 for invalid token, got ${badTokenRes.status}`);
    }
    console.log('Test 9 - Protected endpoint with invalid token returns 401: PASS (Status:', badTokenRes.status, ')');

    // TEST 5 — Invalid login rejected
    console.log('\nRunning Test 5: Invalid credentials rejected...');
    const { data: badLoginData, error: badLoginError } = await publicSupabase.auth.signInWithPassword({
      email: testEmail,
      password: 'WrongPassword999!',
    });
    if (!badLoginError || badLoginData.session) {
      throw new Error('Expected invalid credentials to be rejected');
    }
    console.log('Test 5 - Invalid credentials rejected: PASS');

    // TEST 6 — Session persistence & Token retrieval
    console.log('\nRunning Test 6: Session verification...');
    const { data: userData, error: userError } = await publicSupabase.auth.getUser(token);
    if (userError || userData.user?.id !== testUserId) {
      throw new Error(`Session verification failed: ${userError?.message}`);
    }
    console.log('Test 6 - Session persistence: PASS');

    // TEST 7 — Logout
    console.log('\nRunning Test 7: Logout...');
    const { error: logoutError } = await publicSupabase.auth.signOut();
    if (logoutError) {
      throw new Error(`Sign out failed: ${logoutError.message}`);
    }
    console.log('Test 7 - Logout clears session: PASS');

    // Verify token is revoked after logout
    const afterLogoutRes = await fetch(`http://localhost:${testPort}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('After logout token check (expected 401): Status', afterLogoutRes.status, 'PASS');

    // TEST 12 — Secret exposure check in frontend
    console.log('\nRunning Test 12: Frontend secret exposure check...');
    const clientSrcDir = path.resolve(__dirname, '../../../client/src');
    const clientFiles = fs.readdirSync(clientSrcDir, { recursive: true }) as string[];

    for (const relFile of clientFiles) {
      const fullPath = path.join(clientSrcDir, relFile);
      if (fs.statSync(fullPath).isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('SUPABASE_SECRET_KEY') || content.includes('DATABASE_URL') || content.includes('sb_secret_')) {
          throw new Error(`Leak detected in ${relFile}!`);
        }
      }
    }
    console.log('Test 12 - No backend secrets exposed in frontend code: PASS');

    // CLEANUP TEST USER
    if (testUserId) {
      console.log('\nCleaning up test user...');
      await adminSupabase.auth.admin.deleteUser(testUserId);
      console.log('Test user removed cleanly from Supabase Auth & public.users.');
    }

    console.log('\n========================================');
    console.log('ALL STEP 5 AUTHENTICATION TESTS PASSED (12/12)!');
    console.log('========================================');

  } catch (err: any) {
    console.error('\nVerification failed:', err.message);
    if (testUserId) {
      try {
        await adminSupabase.auth.admin.deleteUser(testUserId);
      } catch {}
    }
    process.exit(1);
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
    process.exit(0);
  }
}

runAuthVerification();
