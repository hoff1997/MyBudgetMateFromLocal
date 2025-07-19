import { supabase } from './supabase';

if (!supabase) {
  console.warn('Supabase not configured — auth listener not attached');
} else {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Supabase Auth Event:', event, session);
    // You can sync session to a global store here if needed
  });
}
