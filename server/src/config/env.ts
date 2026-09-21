import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'DATABASE_URL',
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key] || process.env[key]?.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY!,
  DATABASE_URL: process.env.DATABASE_URL!,
};
