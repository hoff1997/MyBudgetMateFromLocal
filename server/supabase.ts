import { createClient } from '@supabase/supabase-js';

// Create supabase client only if environment variables are available
let supabase: any = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  // Create a single supabase client for interacting with your database
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
      auth: {
        persistSession: false // We're using this for server-side operations
      }
    }
  );
}

export { supabase };

// Test the connection
export async function testSupabaseConnection() {
  if (!supabase) {
    console.log('Supabase client not initialized - missing credentials');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}