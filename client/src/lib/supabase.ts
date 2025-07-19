import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log("🛠️ Supabase URL:", supabaseUrl);
console.log("🛠️ Supabase Key starts with:", supabaseKey?.substring(0, 10)); // don't log the full key!

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Supabase environment variables are not set.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const isSupabaseConfigured = () => !!supabase;

// Auth functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error.message);
    return null;
  }
  return user;
};

// Envelopes functions
export const getEnvelopes = async (userId: number) => {
  const { data, error } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  return { data, error };
};

export const createEnvelope = async (envelope: any) => {
  const { data, error } = await supabase
    .from('envelopes')
    .insert(envelope)
    .select()
    .single();

  return { data, error };
};
