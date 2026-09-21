import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { pool } from '../config/database';
import '../types/auth';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    });
    return;
  }

  const token = authHeader.split(' ')[1]?.trim();

  if (!token) {
    res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid or expired authentication token',
      });
      return;
    }

    const authUser = data.user;

    // Retrieve corresponding profile from public.users
    const userRes = await pool.query(
      'SELECT id, email, name, role FROM public.users WHERE id = $1 AND deleted_at IS NULL',
      [authUser.id]
    );

    let profile = userRes.rows[0];

    // Fallback sync if public.users row does not exist yet (guarantees role is 'visitor')
    if (!profile) {
      const fallbackName = (authUser.user_metadata?.name as string) || authUser.email?.split('@')[0] || 'User';
      const insertRes = await pool.query(
        `INSERT INTO public.users (id, email, name, role)
         VALUES ($1, $2, $3, 'visitor')
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
         RETURNING id, email, name, role`,
        [authUser.id, authUser.email || '', fallbackName]
      );
      profile = insertRes.rows[0];
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    };

    next();
  } catch (err) {
    console.error('Authentication verification error:', (err as Error).message);
    res.status(401).json({
      success: false,
      code: 'AUTH_ERROR',
      message: 'Authentication verification failed',
    });
  }
};

/**
 * Optional authentication: Populates req.user if a valid Bearer token is present,
 * but allows guest/unauthenticated requests to proceed without error.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return next();
  }

  try {
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) {
      const userRes = await pool.query(
        'SELECT id, email, name, role FROM public.users WHERE id = $1 AND deleted_at IS NULL',
        [data.user.id]
      );
      if (userRes.rows.length > 0) {
        req.user = userRes.rows[0];
      }
    }
  } catch {
    // Ignore error for optional auth
  }

  next();
};
