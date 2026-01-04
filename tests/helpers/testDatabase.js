/**
 * Database Test Helpers
 * Utilities for testing database connections and operations
 */

import { getSupabaseAdmin } from '../../src/database/connections/supabase.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Clean up test data from Supabase
 */
export const cleanupSupabaseTestData = async () => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    logger.warn('Supabase not available for cleanup');
    return;
  }

  try {
    // Delete test songs (cascade will handle user_interactions)
    await supabase
      .from('songs')
      .delete()
      .like('title', 'Test Song%');

    // Delete test playlists
    await supabase
      .from('playlists')
      .delete()
      .like('name', 'Test Playlist%');

    // Delete test user preferences (for test users)
    // Note: Be careful with this in shared test environments
    
    logger.debug('Test data cleaned up from Supabase');
  } catch (error) {
    logger.error('Failed to cleanup Supabase test data:', error);
  }
};

/**
 * Create test song in database
 */
export const createTestSong = async (songData) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { data, error } = await supabase
    .from('songs')
    .insert(songData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test song: ${error.message}`);
  }

  return data;
};

/**
 * Create test playlist in database
 */
export const createTestPlaylist = async (playlistData) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { data, error } = await supabase
    .from('playlists')
    .insert(playlistData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test playlist: ${error.message}`);
  }

  return data;
};

/**
 * Delete test song from database
 */
export const deleteTestSong = async (songId) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return;
  }

  await supabase
    .from('songs')
    .delete()
    .eq('id', songId);
};

/**
 * Delete test playlist from database
 */
export const deleteTestPlaylist = async (playlistId) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return;
  }

  await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);
};

/**
 * Verify database connection
 */
export const verifySupabaseConnection = async () => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('songs')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (error) {
    return false;
  }
};

/**
 * Get table row count
 */
export const getTableRowCount = async (tableName) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to get row count: ${error.message}`);
  }

  return count;
};
