import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Read env vars FIRST — no optional chaining that might confuse the bundler
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let configuredClient: SupabaseClient | null = null;
let configurationError = '';

if (supabaseUrl && supabaseAnonKey) {
  try {
    configuredClient = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
  } catch (error) {
    configurationError = error instanceof Error ? error.message : 'Invalid Supabase configuration.';
  }
} else if (supabaseUrl || supabaseAnonKey) {
  configurationError = 'Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured.';
} else {
  configurationError = 'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.';
}

export const supabaseClient = configuredClient;
export const supabaseConfigurationError = configurationError;