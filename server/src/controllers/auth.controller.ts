import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const { data: existingData, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError && existingData?.users) {
      const found = existingData.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (found) {
        // If user exists and is unconfirmed, auto-confirm them
        if (!found.email_confirmed_at) {
          await supabase.auth.admin.updateUserById(found.id, { email_confirm: true });
        }
        res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please sign in.',
        });
        return;
      }
    }

    // Create user with email_confirm: true (avoids Supabase email rate limits completely)
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: name?.trim() || '',
      },
    });

    if (error) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Registration failed';
    res.status(500).json({ success: false, message });
  }
};

export const confirmUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    const found = data?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (found && !found.email_confirmed_at) {
      await supabase.auth.admin.updateUserById(found.id, { email_confirm: true });
      res.status(200).json({ success: true, message: 'User confirmed.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Already confirmed or user not found.' });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    });
    return;
  }

  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
  });
};

export const testAuthenticated = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Authenticated access granted',
    user: {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
    },
  });
};

export const testSubscriber = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Subscriber access granted',
    user: {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
    },
  });
};

export const testAdmin = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Admin access granted',
    user: {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
    },
  });
};

