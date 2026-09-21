import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  CLIENT_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_MONTHLY_PRICE_ID: string;
  STRIPE_YEARLY_PRICE_ID: string;
  STRIPE_SUCCESS_URL: string;
  STRIPE_CANCEL_URL: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

/**
 * Validates and transforms raw environment variables into a strongly typed ServerConfig.
 * Throws informative errors without exposing sensitive credentials.
 */
export function validateEnv(rawEnv: Record<string, string | undefined>): ServerConfig {
  const missingVars: string[] = [];

  const requiredKeys = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'DATABASE_URL'] as const;
  for (const key of requiredKeys) {
    if (!rawEnv[key] || rawEnv[key]!.trim() === '') {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missingVars.join(', ')}`);
  }

  const supabaseUrl = rawEnv.SUPABASE_URL!.trim();
  try {
    const parsed = new URL(supabaseUrl);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error();
    }
  } catch {
    throw new Error('Invalid SUPABASE_URL: must be a valid HTTP/HTTPS URL');
  }

  const rawPort = rawEnv.PORT ?? '5000';
  const port = parseInt(rawPort, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: must be an integer between 1 and 65535 (received "${rawPort}")`);
  }

  const nodeEnv = (rawEnv.NODE_ENV ?? 'development') as 'development' | 'production' | 'test';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: must be development, production, or test (received "${nodeEnv}")`);
  }

  const clientUrl = (rawEnv.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const stripeSecretKey = rawEnv.STRIPE_SECRET_KEY?.trim() || '';

  // Enforce TEST MODE: Reject live Stripe secret keys in Step 2
  if (stripeSecretKey.startsWith('sk_live_')) {
    throw new Error('Invalid STRIPE_SECRET_KEY: Live Stripe credentials are strictly prohibited. Use a test mode key (sk_test_).');
  }

  return {
    PORT: port,
    NODE_ENV: nodeEnv,
    CLIENT_URL: clientUrl,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SECRET_KEY: rawEnv.SUPABASE_SECRET_KEY!.trim(),
    DATABASE_URL: rawEnv.DATABASE_URL!.trim(),
    STRIPE_SECRET_KEY: stripeSecretKey,
    STRIPE_WEBHOOK_SECRET: rawEnv.STRIPE_WEBHOOK_SECRET?.trim() || '',
    STRIPE_MONTHLY_PRICE_ID: rawEnv.STRIPE_MONTHLY_PRICE_ID?.trim() || '',
    STRIPE_YEARLY_PRICE_ID: rawEnv.STRIPE_YEARLY_PRICE_ID?.trim() || '',
    STRIPE_SUCCESS_URL: rawEnv.STRIPE_SUCCESS_URL?.trim() || `${clientUrl}/subscription/success`,
    STRIPE_CANCEL_URL: rawEnv.STRIPE_CANCEL_URL?.trim() || `${clientUrl}/onboarding/checkout`,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
  };
}

// Global validated configuration instance
export const env = validateEnv(process.env);
