import React, { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { config } from '../config/env';
import type { UserProfile } from '../types/auth';
import { AuthContext } from './auth-context-base';

const API_URL = config.apiUrl;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileFromBackend = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setProfile(data.user);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user profile from backend API:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.access_token) {
      await fetchProfileFromBackend(session.access_token);
    }
  }, [session, fetchProfileFromBackend]);

  useEffect(() => {
    // 1. Check current session on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.access_token) {
        fetchProfileFromBackend(initialSession.access_token);
      }
      setLoading(false);
    });

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.access_token) {
        fetchProfileFromBackend(newSession.access_token);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfileFromBackend]);

  const signUp = async (email: string, password: string, name: string) => {
    setError(null);
    try {
      // 1. Register through backend to bypass Supabase free email rate limits & auto-confirm email
      let backendSuccess = false;
      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          backendSuccess = true;
        } else if (resData.message) {
          setError(resData.message);
          return { success: false, error: resData.message };
        }
      } catch (backendErr) {
        console.warn('Backend signup request failed, falling back to direct Supabase:', backendErr);
      }

      // 2. Direct fallback if backend was unavailable
      if (!backendSuccess) {
        const { error: directError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (directError) {
          setError(directError.message);
          return { success: false, error: directError.message };
        }
      }

      // 3. Automatically sign in to establish full authenticated session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('not confirmed')) {
          try {
            await fetch(`${API_URL}/auth/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (retry.error) {
              setError(retry.error.message);
              return { success: false, error: retry.error.message };
            }
            if (retry.data.session?.access_token) {
              await fetchProfileFromBackend(retry.data.session.access_token);
            }
            return { success: true };
          } catch {
            setError(signInError.message);
            return { success: false, error: signInError.message };
          }
        }

        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      if (signInData.session?.access_token) {
        await fetchProfileFromBackend(signInData.session.access_token);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Unexpected error during registration';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle unconfirmed email gracefully by auto-confirming via backend and retrying
      if (signInError && signInError.message.toLowerCase().includes('not confirmed')) {
        try {
          await fetch(`${API_URL}/auth/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          const retry = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          data = retry.data;
          signInError = retry.error;
        } catch (confirmErr) {
          console.error('Auto-confirm attempt failed:', confirmErr);
        }
      }

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      if (data.session?.access_token) {
        await fetchProfileFromBackend(data.session.access_token);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Unexpected error during sign in';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    setError(null);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
