import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let configuredClient: SupabaseClient | null = null;
let configurationError = '';

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Remove quotes if present from env values
    const cleanUrl = supabaseUrl.replace(/^"|"$/g, '');
    const cleanKey = supabaseAnonKey.replace(/^"|"$/g, '');
    configuredClient = createClient(cleanUrl, cleanKey);
  } catch (error) {
    configurationError = error instanceof Error ? error.message : 'Failed to initialize Supabase client.';
  }
} else {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  configurationError = `Missing environment variables: ${missing.join(', ')}`;
}

export const supabaseClient: SupabaseClient | null = configuredClient;
export const supabaseConfigurationError: string = configurationError;