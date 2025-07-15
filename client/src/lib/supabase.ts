import { createClient } from '@supabase/supabase-js';

// Client-side Supabase configuration
// These environment variables must be prefixed with VITE_ to be available in the browser

let supabaseUrl = '';
let supabaseKey = '';

// Check for Supabase environment variables
if (import.meta.env.VITE_SUPABASE_URL) {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
}

if (import.meta.env.VITE_SUPABASE_KEY) {
  supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
}

// Create Supabase client if credentials are available
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// Authentication helpers
export const signUp = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Database helpers for direct client-side operations (if needed)
export const getEnvelopes = async (userId: number) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  
  return { data, error };
};

export const createEnvelope = async (envelope: any) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('envelopes')
    .insert(envelope)
    .select()
    .single();
  
  return { data, error };
};