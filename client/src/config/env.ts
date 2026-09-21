/**
 * Centralized Client-Side Environment Configuration
 * Only public VITE_* variables may be defined here.
 */

export interface ClientConfig {
  apiUrl: string;
  supabase: {
    url: string;
    publishableKey: string;
  };
  mode: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

export function validateClientEnv(rawEnv: Record<string, string | undefined>): ClientConfig {
  const supabaseUrl = rawEnv.VITE_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error('Missing required frontend environment variable: VITE_SUPABASE_URL');
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error();
    }
  } catch {
    throw new Error('Invalid VITE_SUPABASE_URL: must be a valid HTTP/HTTPS URL');
  }

  const supabaseKey = rawEnv.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseKey) {
    throw new Error('Missing required frontend environment variable: VITE_SUPABASE_PUBLISHABLE_KEY');
  }

  const apiUrl = (rawEnv.VITE_API_URL?.trim() || 'http://localhost:5000/api').replace(/\/$/, '');

  const mode = rawEnv.MODE || 'development';

  return {
    apiUrl,
    supabase: {
      url: supabaseUrl,
      publishableKey: supabaseKey,
    },
    mode,
    isProduction: mode === 'production',
    isDevelopment: mode === 'development',
  };
}

// Global validated configuration instance
export const config: ClientConfig = validateClientEnv({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
});
