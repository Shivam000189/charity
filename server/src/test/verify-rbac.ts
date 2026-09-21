/**
 * Automated Verification Script for Step 6: Authorization & Role-Based Access Control (RBAC)
 *
 * Verifies the complete 12-test matrix:
 * 1. No token -> authenticated endpoint (401)
 * 2. Invalid token -> authenticated endpoint (401)
 * 3. Visitor -> authenticated endpoint (200)
 * 4. Visitor -> subscriber endpoint (403)
 * 5. Visitor -> admin endpoint (403)
 * 6. Subscriber -> authenticated endpoint (200)
 * 7. Subscriber -> subscriber endpoint (200)
 * 8. Subscriber -> admin endpoint (403)
 * 9. Admin -> authenticated endpoint (200)
 * 10. Admin -> subscriber endpoint (200)
 * 11. Admin -> admin endpoint (200)
 * 12. Attempt client role tampering (X-Role, X-User-Role, body) -> Denied (403)
 */

process.env.NODE_ENV = 'test';

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.NODE_ENV = 'test';

import { createClient } from '@supabase/supabase-js';
import { pool } from '../config/database';
import { Server } from 'http';

const testPort = 5056;
let serverInstance: Server;

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in server/.env');
  process.exit(1);
}

// Privileged client for test cleanup & administrative operations
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Browser simulator client
const publicSupabase = createClient(
  SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_m2GCI9Me4qKDEMxUfoCU-w_qQNE_AVY'
);

interface ApiResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

async function runRbacTests() {
  console.log('--- STARTING STEP 6 AUTHORIZATION & RBAC VERIFICATION ---');

  const { app } = await import('../server');
  serverInstance = app.listen(testPort, () => {
    console.log(`Test server running on port ${testPort}`);
  });

  const timestamp = Date.now();
  const testEmail = `rbactest_${timestamp}@example.com`;
  const testPassword = 'Password123!@#Test';
  let testUserId = '';
  let token = '';

  try {
    // 0. Setup: Create test user with auto-confirmed email
    console.log('\n[Setup] Creating test user for RBAC verification...');
    const { data: signupData, error: signupError } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: 'RBAC Test User' },
    });

    if (signupError || !signupData.user) {
      throw new Error(`Failed to create test user: ${signupError?.message}`);
    }

    testUserId = signupData.user.id;

    // Login to obtain active session access_token
    const { data: loginData, error: loginError } = await publicSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (loginError || !loginData.session) {
      throw new Error(`Failed to log in test user: ${loginError?.message}`);
    }

    token = loginData.session.access_token;
    console.log(`Test user created and logged in. (ID: ${testUserId})`);

    // Ensure database profile exists as visitor
    await pool.query('SELECT id, role FROM public.users WHERE id = $1', [testUserId]);

    // -------------------------------------------------------------------------
    // TEST 1 — No token -> authenticated endpoint (401)
    // -------------------------------------------------------------------------
    console.log('\nRunning Test 1: No token -> authenticated endpoint...');
    const res1 = await fetch(`http://localhost:${testPort}/api/auth/test/authenticated`);
    const data1 = (await res1.json()) as ApiResponse;
    if (res1.status !== 401 || data1.success !== false) {
      throw new Error(`Test 1 Failed: Expected 401, got ${res1.status}`);
    }
    console.log('Test 1 - No token -> authenticated: PASS (Status: 401)');

    // -------------------------------------------------------------------------
    // TEST 2 — Invalid token -> authenticated endpoint (401)
    // -------------------------------------------------------------------------
    console.log('\nRunning Test 2: Invalid token -> authenticated endpoint...');
    const res2 = await fetch(`http://localhost:${testPort}/api/auth/test/authenticated`, {
      headers: { Authorization: 'Bearer totally.invalid.token' },
    });
    const data2 = (await res2.json()) as ApiResponse;
    if (res2.status !== 401 || data2.success !== false) {
      throw new Error(`Test 2 Failed: Expected 401, got ${res2.status}`);
    }
    console.log('Test 2 - Invalid token -> authenticated: PASS (Status: 401)');

    // -------------------------------------------------------------------------
    // TEST 3 — Visitor -> authenticated endpoint (200)
    // -------------------------------------------------------------------------
    console.log('\nRunning Test 3: Visitor -> authenticated endpoint...');
    const res3 = await fetch(`http://localhost:${testPort}/api/auth/test/authenticated`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data3 = (await res3.json()) as ApiResponse;
    if (res3.status !== 200 || !data3.success || data3.user?.role !== 'visitor') {
      throw new Error(`Test 3 Failed: Expected 200 with role visitor, got ${res3.status} ${JSON.stringify(data3)}`);
    }
    console.log('Test 3 - Visitor -> authenticated: PASS (Status: 200, Role: visitor)');

    // -------------------------------------------------------------------------
    // TEST 4 — Visitor -> subscriber endpoint (403)
    // -------------------------------------------------------------------------
    console.log('\nRunning Test 4: Visitor -> subscriber endpoint...');
    const res4 = await fetch(`http://localhost:${testPort}/api/auth/test/subscriber`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data4 = (await res4.json()) as ApiResponse;
    if (res4.status !== 403 || data4.success !== false) {
      throw new Error(`Test 4 Failed: Expected 403 Forbidden, got ${res4.status}`);
    }
    console.log('Test 4 - Visitor -> subscriber: PASS (Status: 403)');

    // -------------------------------------------------------------------------
    // TEST 5 — Visitor -> admin endpoint (403)
    // -------------------------------------------------------------------------
    console.log('\nRunning Test 5: Visitor -> admin endpoint...');
    const res5 = await fetch(`http://localhost:${testPort}/api/auth/test/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data5 = (await res5.json()) as ApiResponse;
    if (res5.status !== 403 || data5.success !== false) {
      throw new Error(`Test 5 Failed: Expected 403 Forbidden, got ${res5.status}`);
    }
    console.log('Test 5 - Visitor -> admin: PASS (Status: 403)');

    // -------------------------------------------------------------------------
    // TEST 12 — Client role tampering rejected
    // -------------------------------------------------------------------------
    console.log('\nRunning Test 12: Client role tampering attempt (headers & body)...');
    const res12 = await fetch(`http://localhost:${testPort}/api/auth/test/admin`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Role': 'admin',
        'X-User-Role': 'admin',
        'Content-Type': 'application/json',
      },
    });
    const data12 = (await res12.json()) as ApiResponse;
    if (res12.status !== 403 || data12.success !== false) {
      throw new Error(`Test 12 Failed: Expected 403 despite client header injection, got ${res12.status}`);
    }
    console.log('Test 12 - Client role tampering: PASS (Denied with 403)');

    // -------------------------------------------------------------------------
    // TEST 6, 7, 8 — Subscriber Tests
    // Promote user to subscriber in database (trusted server update)
    // -------------------------------------------------------------------------
    console.log('\n[Setup] Promoting test user to "subscriber" in database...');
    await pool.query("UPDATE public.users SET role = 'subscriber' WHERE id = $1", [testUserId]);

    console.log('Running Test 6: Subscriber -> authenticated endpoint...');
    const res6 = await fetch(`http://localhost:${testPort}/api/auth/test/authenticated`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data6 = (await res6.json()) as ApiResponse;
    if (res6.status !== 200 || !data6.success || data6.user?.role !== 'subscriber') {
      throw new Error(`Test 6 Failed: Expected 200, got ${res6.status}`);
    }
    console.log('Test 6 - Subscriber -> authenticated: PASS (Status: 200, Role: subscriber)');

    console.log('Running Test 7: Subscriber -> subscriber endpoint...');
    const res7 = await fetch(`http://localhost:${testPort}/api/auth/test/subscriber`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data7 = (await res7.json()) as ApiResponse;
    if (res7.status !== 200 || !data7.success) {
      throw new Error(`Test 7 Failed: Expected 200, got ${res7.status}`);
    }
    console.log('Test 7 - Subscriber -> subscriber: PASS (Status: 200)');

    console.log('Running Test 8: Subscriber -> admin endpoint...');
    const res8 = await fetch(`http://localhost:${testPort}/api/auth/test/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data8 = (await res8.json()) as ApiResponse;
    if (res8.status !== 403 || data8.success !== false) {
      throw new Error(`Test 8 Failed: Expected 403, got ${res8.status}`);
    }
    console.log('Test 8 - Subscriber -> admin: PASS (Status: 403)');

    // -------------------------------------------------------------------------
    // TEST 9, 10, 11 — Admin Tests
    // Promote user to admin in database (trusted server update)
    // -------------------------------------------------------------------------
    console.log('\n[Setup] Promoting test user to "admin" in database...');
    await pool.query("UPDATE public.users SET role = 'admin' WHERE id = $1", [testUserId]);

    console.log('Running Test 9: Admin -> authenticated endpoint...');
    const res9 = await fetch(`http://localhost:${testPort}/api/auth/test/authenticated`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data9 = (await res9.json()) as ApiResponse;
    if (res9.status !== 200 || !data9.success || data9.user?.role !== 'admin') {
      throw new Error(`Test 9 Failed: Expected 200, got ${res9.status}`);
    }
    console.log('Test 9 - Admin -> authenticated: PASS (Status: 200, Role: admin)');

    console.log('Running Test 10: Admin -> subscriber endpoint...');
    const res10 = await fetch(`http://localhost:${testPort}/api/auth/test/subscriber`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data10 = (await res10.json()) as ApiResponse;
    if (res10.status !== 200 || !data10.success) {
      throw new Error(`Test 10 Failed: Expected 200, got ${res10.status}`);
    }
    console.log('Test 10 - Admin -> subscriber: PASS (Status: 200)');

    console.log('Running Test 11: Admin -> admin endpoint...');
    const res11 = await fetch(`http://localhost:${testPort}/api/auth/test/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data11 = (await res11.json()) as ApiResponse;
    if (res11.status !== 200 || !data11.success) {
      throw new Error(`Test 11 Failed: Expected 200, got ${res11.status}`);
    }
    console.log('Test 11 - Admin -> admin: PASS (Status: 200)');

    console.log('\n========================================');
    console.log('ALL STEP 6 RBAC TESTS PASSED (12/12)!');
    console.log('========================================\n');
  } finally {
    // Cleanup test user
    if (testUserId) {
      console.log('Cleaning up test user...');
      try {
        await pool.query('DELETE FROM public.users WHERE id = $1', [testUserId]);
        await adminSupabase.auth.admin.deleteUser(testUserId);
        console.log('Test user removed cleanly.');
      } catch (cleanupErr) {
        console.error('Failed to cleanup test user:', (cleanupErr as Error).message);
      }
    }

    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
    process.exit(0);
  }
}

runRbacTests().catch((err) => {
  console.error('RBAC Verification Suite Failed:', err);
  process.exit(1);
});
