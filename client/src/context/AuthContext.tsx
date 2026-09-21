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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { success: false, error: signUpError.message };
      }

      if (data.session?.access_token) {
        await fetchProfileFromBackend(data.session.access_token);
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
