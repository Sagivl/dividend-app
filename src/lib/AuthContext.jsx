'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient, clearSessionCache } from '@/lib/supabaseClient';

const AUTH_TIMEOUT_MS = 8000;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const initRef = useRef(false);

  const supabase = getSupabaseBrowserClient();

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch {
      // Profile fetch is non-critical — don't block auth on it
    }
  }, [supabase]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setIsLoadingAuth(false);
      }
    }, AUTH_TIMEOUT_MS);

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          setAuthError({ type: 'session_error', message: error.message });
          setIsLoadingAuth(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          // Fetch profile in background — don't block auth resolution
          fetchProfile(session.user.id);
        }
      } catch (err) {
        if (!cancelled) {
          setAuthError({ type: 'unknown', message: err.message });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAuth(false);
        }
        clearTimeout(timeoutId);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          clearSessionCache();
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    clearSessionCache();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      logout,
      signIn,
      signUp,
      refreshProfile,
      navigateToLogin: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
