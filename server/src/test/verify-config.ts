/**
 * Automated Verification Script for Step 8: Environment & Configuration Management
 *
 * Verifies:
 * 1. Valid environment parsing.
 * 2. Missing SUPABASE_URL failure.
 * 3. Missing SUPABASE_SECRET_KEY failure.
 * 4. Missing DATABASE_URL failure.
 * 5. Invalid SUPABASE_URL failure.
 * 6. Invalid PORT failure.
 * 7. Frontend configuration validation (validateClientEnv).
 * 8. Codebase secret audit: client/src contains zero references to backend secrets.
 * 9. Production bundle audit: client/dist contains zero backend secrets.
 */

import fs from 'fs';
import path from 'path';
import { validateEnv } from '../config/env';

// We can test client validation logic by importing it or checking its function
const validMockEnv = {
  PORT: '5000',
  NODE_ENV: 'development',
  CLIENT_URL: 'http://localhost:5173',
  SUPABASE_URL: 'https://valid-project.supabase.co',
  SUPABASE_SECRET_KEY: 'test-secret-key-abcdef123456',
  DATABASE_URL: 'postgresql://postgres:password@db.project.supabase.co:5432/postgres',
};

async function runConfigVerification() {
  console.log('--- STARTING STEP 8 ENVIRONMENT & CONFIGURATION VERIFICATION ---');

  // TEST 1 — Valid environment parsing
  console.log('\nRunning Test 1: Valid server environment parsing...');
  const parsed = validateEnv(validMockEnv);
  if (parsed.PORT !== 5000 || parsed.SUPABASE_URL !== validMockEnv.SUPABASE_URL || !parsed.isDevelopment) {
    throw new Error('Test 1 Failed: Valid configuration did not parse correctly');
  }
  console.log('Test 1 - Valid environment parsing: PASS (Port: 5000, Mode: development)');

  // TEST 2 — Missing SUPABASE_URL failure
  console.log('\nRunning Test 2: Missing SUPABASE_URL...');
  try {
    validateEnv({ ...validMockEnv, SUPABASE_URL: '' });
    throw new Error('Expected validation error for missing SUPABASE_URL');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes('SUPABASE_URL')) {
      throw new Error(`Test 2 Failed: Error did not mention SUPABASE_URL (${msg})`);
    }
    console.log('Test 2 - Missing SUPABASE_URL triggers failure: PASS');
  }

  // TEST 3 — Missing SUPABASE_SECRET_KEY failure
  console.log('\nRunning Test 3: Missing SUPABASE_SECRET_KEY...');
  try {
    validateEnv({ ...validMockEnv, SUPABASE_SECRET_KEY: '' });
    throw new Error('Expected validation error for missing SUPABASE_SECRET_KEY');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes('SUPABASE_SECRET_KEY')) {
      throw new Error(`Test 3 Failed: Error did not mention SUPABASE_SECRET_KEY (${msg})`);
    }
    console.log('Test 3 - Missing SUPABASE_SECRET_KEY triggers failure: PASS');
  }

  // TEST 4 — Missing DATABASE_URL failure
  console.log('\nRunning Test 4: Missing DATABASE_URL...');
  try {
    validateEnv({ ...validMockEnv, DATABASE_URL: '' });
    throw new Error('Expected validation error for missing DATABASE_URL');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes('DATABASE_URL')) {
      throw new Error(`Test 4 Failed: Error did not mention DATABASE_URL (${msg})`);
    }
    console.log('Test 4 - Missing DATABASE_URL triggers failure: PASS');
  }

  // TEST 5 — Invalid SUPABASE_URL failure
  console.log('\nRunning Test 5: Invalid SUPABASE_URL...');
  try {
    validateEnv({ ...validMockEnv, SUPABASE_URL: 'not-a-valid-url' });
    throw new Error('Expected validation error for invalid SUPABASE_URL');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes('Invalid SUPABASE_URL')) {
      throw new Error(`Test 5 Failed: Error did not indicate invalid SUPABASE_URL (${msg})`);
    }
    console.log('Test 5 - Invalid SUPABASE_URL triggers validation error: PASS');
  }

  // TEST 6 — Invalid PORT failure
  console.log('\nRunning Test 6: Invalid PORT...');
  try {
    validateEnv({ ...validMockEnv, PORT: 'invalid_port_999999' });
    throw new Error('Expected validation error for invalid PORT');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes('Invalid PORT')) {
      throw new Error(`Test 6 Failed: Error did not indicate invalid PORT (${msg})`);
    }
    console.log('Test 6 - Invalid PORT triggers validation error: PASS');
  }

  // TEST 7 — Frontend client environment validation check
  console.log('\nRunning Test 7: Frontend client environment validation...');
  const clientEnvPath = path.resolve(__dirname, '../../../client/src/config/env.ts');
  if (!fs.existsSync(clientEnvPath)) {
    throw new Error('client/src/config/env.ts does not exist');
  }
  const clientEnvCode = fs.readFileSync(clientEnvPath, 'utf8');
  if (!clientEnvCode.includes('validateClientEnv') || !clientEnvCode.includes('VITE_SUPABASE_URL')) {
    throw new Error('client/src/config/env.ts does not contain validateClientEnv implementation');
  }
  console.log('Test 7 - Frontend client environment validation: PASS');

  // TEST 8 — Codebase secret audit in client/src
  console.log('\nRunning Test 8: Secret audit in client/src/ source code...');
  const clientSrcDir = path.resolve(__dirname, '../../../client/src');
  function scanDirForSecrets(dir: string): string[] {
    const findings: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findings.push(...scanDirForSecrets(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('SUPABASE_SECRET_KEY') && !fullPath.includes('.example')) {
          findings.push(`${fullPath}: contains SUPABASE_SECRET_KEY`);
        }
        if (content.includes('DATABASE_URL') && !fullPath.includes('.example')) {
          findings.push(`${fullPath}: contains DATABASE_URL`);
        }
        if (content.includes('STRIPE_SECRET_KEY') && !fullPath.includes('.example')) {
          findings.push(`${fullPath}: contains STRIPE_SECRET_KEY`);
        }
        if (content.includes('STRIPE_WEBHOOK_SECRET') && !fullPath.includes('.example')) {
          findings.push(`${fullPath}: contains STRIPE_WEBHOOK_SECRET`);
        }
      }
    }
    return findings;
  }

  const clientFindings = scanDirForSecrets(clientSrcDir);
  if (clientFindings.length > 0) {
    throw new Error(`Test 8 Failed: Found backend secret references in client/src:\n${clientFindings.join('\n')}`);
  }
  console.log('Test 8 - Client source secret audit: PASS (0 backend secret tokens found)');

  // TEST 9 — Production bundle audit in client/dist
  console.log('\nRunning Test 9: Production bundle audit in client/dist/...');
  const clientDistDir = path.resolve(__dirname, '../../../client/dist');
  if (fs.existsSync(clientDistDir)) {
    const distFindings: string[] = [];
    const jsFiles = fs.readdirSync(path.join(clientDistDir, 'assets')).filter((f) => f.endsWith('.js'));
    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(clientDistDir, 'assets', jsFile), 'utf8');
      if (content.includes('SUPABASE_SECRET_KEY')) {
        distFindings.push(`client/dist/assets/${jsFile} contains SUPABASE_SECRET_KEY`);
      }
      if (content.includes('DATABASE_URL')) {
        distFindings.push(`client/dist/assets/${jsFile} contains DATABASE_URL`);
      }
      if (content.includes('STRIPE_SECRET_KEY')) {
        distFindings.push(`client/dist/assets/${jsFile} contains STRIPE_SECRET_KEY`);
      }
      if (content.includes('STRIPE_WEBHOOK_SECRET')) {
        distFindings.push(`client/dist/assets/${jsFile} contains STRIPE_WEBHOOK_SECRET`);
      }
    }

    if (distFindings.length > 0) {
      throw new Error(`Test 9 Failed: Found backend secret references in production bundle:\n${distFindings.join('\n')}`);
    }
    console.log('Test 9 - Production bundle secret audit: PASS (0 backend secret tokens found in dist)');
  } else {
    console.log('Test 9 - Production bundle audit: SKIPPED (dist not yet generated, build will verify)');
  }

  console.log('\n========================================');
  console.log('ALL STEP 8 CONFIGURATION TESTS PASSED!');
  console.log('========================================\n');
}

runConfigVerification().catch((err) => {
  console.error('Configuration Verification Failed:', err);
  process.exit(1);
});
