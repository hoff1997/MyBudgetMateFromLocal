import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';

// Fetch Supabase configuration from server
let supabase: any = null;
let configLoaded = false;

async function initializeSupabase() {
  if (configLoaded) return supabase;
  
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    
    if (config.supabaseUrl && config.supabaseAnonKey) {
      supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
      console.log('Supabase client initialized successfully');
    } else {
      console.warn('Supabase credentials not available from server');
    }
  } catch (error) {
    console.error('Failed to fetch Supabase config:', error);
  }
  
  configLoaded = true;
  return supabase;
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any = null;
    
    const initAuth = async () => {
      const client = await initializeSupabase();
      
      if (!client) {
        console.warn('Supabase not available, authentication disabled');
        setLoading(false);
        return;
      }

      try {
        // Get initial session
        const { data: { session } } = await client.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Listen for authentication changes
        const { data: authSubscription } = client.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
        
        subscription = authSubscription;
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initAuth();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const client = await initializeSupabase();
    if (!client) throw new Error('Authentication not available');
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const client = await initializeSupabase();
    if (!client) throw new Error('Authentication not available');
    
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const client = await initializeSupabase();
    if (!client) throw new Error('Authentication not available');
    
    const { error } = await client.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const client = await initializeSupabase();
    if (!client) throw new Error('Authentication not available');
    
    const { data, error } = await client.auth.resetPasswordForEmail(email);
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

export { initializeSupabase };