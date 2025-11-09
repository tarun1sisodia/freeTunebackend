import { createClient } from '@supabase/supabase-js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

let supabaseClient = null;
let supabaseAdminClient = null;

/**
 * Returns a singleton Supabase client using the anon public key.
 * Logs warnings instead of throwing on missing configuration (production-friendly).
 */
const getSupabaseClient = () => {
  if (!supabaseClient) {
    if (!config.supabase.url || !config.supabase.anonKey) {
      logger.error('Supabase configuration missing: URL or Anon Key are not set');
      return null;
    }

    try {
      supabaseClient = createClient(
        config.supabase.url,
        config.supabase.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: false,
          },
        }
      );
      logger.info('Supabase client initialized');
    } catch (error) {
      logger.error('Failed to initialize Supabase client:', error);
      supabaseClient = null;
      return null;
    }
  }

  return supabaseClient;
};

/**
 * Returns a singleton Supabase client using the service role key for admin access.
 * Logs warning instead of throwing on missing configuration (production-friendly).
 */
const getSupabaseAdmin = () => {
  if (!supabaseAdminClient) {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      logger.error('Supabase admin configuration missing: URL or Service Role Key are not set');
      return null;
    }

    try {
      supabaseAdminClient = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      logger.info('Supabase admin client initialized');
    } catch (error) {
      logger.error('Failed to initialize Supabase admin client:', error);
      supabaseAdminClient = null;
      return null;
    }
  }

  return supabaseAdminClient;
};

export { getSupabaseClient, getSupabaseAdmin };
