import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { env } from './config/env';
import { pool, checkDatabaseConnection } from './config/database';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';

export const app = express();
export const httpServer = createServer(app);
const PORT = env.PORT;

app.use(express.json());

const localOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const envOrigins = [
  env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
  process.env.CORS_ORIGIN,
]
  .filter(Boolean)
  .flatMap((val) => (val as string).split(','))
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');

  if (env.NODE_ENV !== 'production' && localOrigins.includes(normalized)) {
    return true;
  }

  if (envOrigins.includes(normalized) || envOrigins.includes('*')) {
    return true;
  }

  if (env.NODE_ENV === 'production') {
    return false;
  }

  return true;
};

app.use(
  cors((req, callback) => {
    const origin = req.header('Origin');
    if (isOriginAllowed(origin)) {
      return callback(null, { origin: true, credentials: true });
    }
    return callback(null, { origin: false, credentials: true });
  })
);

// Health check routes
app.use('/api', healthRoutes);
app.use('/', healthRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Root informational endpoint
app.get(['/', '/api'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Digital Hero API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

if (env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, async () => {
    console.log(`Server listening at http://localhost:${PORT}`);
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      console.log('Successfully connected to Supabase PostgreSQL database.');
    } else {
      console.warn('Warning: Could not connect to Supabase PostgreSQL database.');
    }
  });
}

const gracefulShutdown = async () => {
  console.log('Shutting down server gracefully...');
  try {
    await pool.end();
    console.log('PostgreSQL pool drained.');
  } catch (err) {
    console.error('Error closing database pool:', (err as Error).message);
  }

  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
