import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 
import type { User, Session } from '@supabase/supabase-js';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any = null;

    const initAuth = async () => {
      console.log("👤 Restoring session from Supabase...");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("✅ Session from getSession:", session);

        if (!session?.user) {
          console.warn("⚠️ No valid user session. Signing out...");
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session.user);
        setLoading(false);

        const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log("🔁 onAuthStateChange triggered:", _event);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });

        subscription = authSubscription;
      } catch (error) {
        console.error("Auth init error:", error);
        setUser(null);
        setSession(null);
        setLoading(false); // ✅ force end loading on error
      }
    };

    initAuth();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://replit-11-july.vercel.app/dashboard',
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
  };
}
