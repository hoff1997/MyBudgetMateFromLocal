import { supabase } from './supabase';

// Helper function to check if Supabase is available
function checkSupabase() {
  if (!supabase) {
    console.log('Supabase not configured - skipping initialization');
    return null;
  }
  return supabase;
}

/**
 * Initialize demo data in Supabase
 * This function creates a demo user with sample budgets, envelopes, and transactions
 * Only runs if the database is empty to avoid duplicating data
 */
export async function initializeSupabaseData(): Promise<void> {
  const client = checkSupabase();
  if (!client) return;

  try {
    // Check if we already have users in the database
    const { data: existingUsers, error: userCheckError } = await client
      .from('users')
      .select('id')
      .limit(1);

    if (userCheckError) {
      console.error('Error checking for existing users:', userCheckError);
      return;
    }

    // If users already exist, don't initialize demo data
    if (existingUsers && existingUsers.length > 0) {
      console.log('📊 Supabase database already contains data - skipping initialization');
      return;
    }

    console.log('🔄 Supabase initialized - ready for user data');

    // Skip demo data creation - user will create their own account via authentication
    console.log('👤 Clean slate ready - no demo user needed');

    // Skip demo accounts, envelopes, and transactions - user will create their own data
    console.log('🏦 No demo accounts created - clean slate ready');
    console.log('📂 No demo envelope categories created - user driven setup'); 
    console.log('💰 No demo envelopes created - user driven setup');
    console.log('💳 No demo transactions created - user driven setup');
    console.log('🏷️ No demo labels created - user driven setup');
    console.log('✅ Supabase initialization complete - clean slate ready!');

  } catch (error) {
    console.error('❌ Error initializing Supabase data:', error);
  }
}

/**
 * Clean up all demo data from Supabase
 * Use this function to reset the database to a clean state
 */
export async function cleanSupabaseData(): Promise<void> {
  try {
    console.log('🧹 Cleaning up Supabase data...');

    // Delete in reverse order of dependencies
    await supabase.from('transaction_labels').delete().gte('id', 0);
    await supabase.from('transaction_envelopes').delete().gte('id', 0);
    await supabase.from('labels').delete().gte('id', 0);
    await supabase.from('transactions').delete().gte('id', 0);
    await supabase.from('envelopes').delete().gte('id', 0);
    await supabase.from('envelope_categories').delete().gte('id', 0);
    await supabase.from('accounts').delete().gte('id', 0);
    await supabase.from('users').delete().gte('id', 0);

    console.log('✅ Supabase cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning Supabase data:', error);
  }
}