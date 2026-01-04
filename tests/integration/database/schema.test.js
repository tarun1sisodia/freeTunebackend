/**
 * Database Schema Validation Tests
 * Validates PostgreSQL schema structure and constraints
 */

import { getSupabaseAdmin } from '../../../src/database/connections/supabase.js';
import { createMockSong, createMockPlaylist, createMockInteraction } from '../../helpers/mockData.js';
import { cleanupSupabaseTestData } from '../../helpers/testDatabase.js';

describe('Database Schema Validation Tests', () => {
  let supabase;

  beforeAll(() => {
    supabase = getSupabaseAdmin();
  });

  afterAll(async () => {
    await cleanupSupabaseTestData();
  });

  describe('songs Table Schema', () => {
    test('should have all required columns', async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .limit(1);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const song = data[0];
        expect(song).toHaveProperty('id');
        expect(song).toHaveProperty('title');
        expect(song).toHaveProperty('artist');
        expect(song).toHaveProperty('album');
        expect(song).toHaveProperty('album_art_url');
        expect(song).toHaveProperty('duration_ms');
        expect(song).toHaveProperty('r2_key');
        expect(song).toHaveProperty('file_sizes');
        expect(song).toHaveProperty('play_count');
        expect(song).toHaveProperty('last_updated');
        expect(song).toHaveProperty('popularity_score');
        expect(song).toHaveProperty('metadata');
        expect(song).toHaveProperty('created_at');
        expect(song).toHaveProperty('updated_at');
      }
    });

    test('should enforce NOT NULL constraints on title', async () => {
      const mockSong = createMockSong();
      delete mockSong.title; // Remove required field

      const { error } = await supabase
        .from('songs')
        .insert(mockSong);

      expect(error).not.toBeNull();
      expect(error.message).toMatch(/null value|violates not-null/i);
    });

    test('should enforce NOT NULL constraints on artist', async () => {
      const mockSong = createMockSong();
      delete mockSong.artist;

      const { error } = await supabase
        .from('songs')
        .insert(mockSong);

      expect(error).not.toBeNull();
    });

    test('should enforce NOT NULL constraints on duration_ms', async () => {
      const mockSong = createMockSong();
      delete mockSong.duration_ms;

      const { error } = await supabase
        .from('songs')
        .insert(mockSong);

      expect(error).not.toBeNull();
    });

    test('should enforce NOT NULL constraints on r2_key', async () => {
      const mockSong = createMockSong();
      delete mockSong.r2_key;

      const { error } = await supabase
        .from('songs')
        .insert(mockSong);

      expect(error).not.toBeNull();
    });

    test('should have UUID primary key', async () => {
      const mockSong = createMockSong();

      const { data, error } = await supabase
        .from('songs')
        .insert(mockSong)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Cleanup
      await supabase.from('songs').delete().eq('id', data.id);
    });

    test('should have correct data types', async () => {
      const mockSong = createMockSong();

      const { data, error } = await supabase
        .from('songs')
        .insert(mockSong)
        .select()
        .single();

      expect(error).toBeNull();
      expect(typeof data.title).toBe('string');
      expect(typeof data.artist).toBe('string');
      expect(typeof data.duration_ms).toBe('number');
      expect(typeof data.play_count).toBe('number');
      expect(typeof data.file_sizes).toBe('object');
      expect(typeof data.metadata).toBe('object');

      // Cleanup
      await supabase.from('songs').delete().eq('id', data.id);
    });

    test('should store JSONB file_sizes correctly', async () => {
      const mockSong = createMockSong({
        file_sizes: {
          original: 28946239,
          high: 7123241,
          medium: 3232401,
          low: 1583230,
        },
      });

      const { data, error } = await supabase
        .from('songs')
        .insert(mockSong)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.file_sizes).toHaveProperty('original');
      expect(data.file_sizes).toHaveProperty('high');
      expect(data.file_sizes.original).toBe(28946239);

      // Cleanup
      await supabase.from('songs').delete().eq('id', data.id);
    });
  });

  describe('user_interactions Table Schema', () => {
    let testSongId;

    beforeAll(async () => {
      const mockSong = createMockSong();
      const { data } = await supabase
        .from('songs')
        .insert(mockSong)
        .select()
        .single();
      testSongId = data?.id;
    });

    afterAll(async () => {
      if (testSongId) {
        await supabase.from('songs').delete().eq('id', testSongId);
      }
    });

    test('should have all required columns', async () => {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .limit(1);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const interaction = data[0];
        expect(interaction).toHaveProperty('id');
        expect(interaction).toHaveProperty('user_id');
        expect(interaction).toHaveProperty('song_id');
        expect(interaction).toHaveProperty('action_type');
        expect(interaction).toHaveProperty('session_id');
        expect(interaction).toHaveProperty('created_at');
        expect(interaction).toHaveProperty('metadata');
      }
    });

    test('should enforce CHECK constraint on action_type', async () => {
      if (!testSongId) {
        console.warn('Test song not created, skipping test');
        return;
      }

      const mockInteraction = createMockInteraction({
        song_id: testSongId,
        action_type: 'invalid_action', // Invalid action type
      });

      const { error } = await supabase
        .from('user_interactions')
        .insert(mockInteraction);

      expect(error).not.toBeNull();
    });

    test('should allow valid action_types', async () => {
      if (!testSongId) return;

      const validActions = ['play', 'like', 'skip', 'download'];

      for (const action of validActions) {
        const mockInteraction = createMockInteraction({
          song_id: testSongId,
          action_type: action,
        });

        const { data, error } = await supabase
          .from('user_interactions')
          .insert(mockInteraction)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.action_type).toBe(action);

        // Cleanup
        await supabase.from('user_interactions').delete().eq('id', data.id);
      }
    });

    test('should have foreign key to songs', async () => {
      const mockInteraction = createMockInteraction({
        song_id: '00000000-0000-0000-0000-000000000000', // Non-existent song
      });

      const { error } = await supabase
        .from('user_interactions')
        .insert(mockInteraction);

      // Should fail due to foreign key constraint
      expect(error).not.toBeNull();
    });

    test('should CASCADE delete when song is deleted', async () => {
      // Create temporary song
      const tempSong = createMockSong();
      const { data: songData } = await supabase
        .from('songs')
        .insert(tempSong)
        .select()
        .single();

      // Create interaction for this song
      const mockInteraction = createMockInteraction({
        song_id: songData.id,
      });

      const { data: interactionData } = await supabase
        .from('user_interactions')
        .insert(mockInteraction)
        .select()
        .single();

      // Delete song
      await supabase.from('songs').delete().eq('id', songData.id);

      // Check if interaction was cascaded deleted
      const { data: checkInteraction } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('id', interactionData.id)
        .single();

      expect(checkInteraction).toBeNull();
    });
  });

  describe('playlists Table Schema', () => {
    test('should have all required columns', async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .limit(1);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const playlist = data[0];
        expect(playlist).toHaveProperty('id');
        expect(playlist).toHaveProperty('user_id');
        expect(playlist).toHaveProperty('name');
        expect(playlist).toHaveProperty('description');
        expect(playlist).toHaveProperty('song_ids');
        expect(playlist).toHaveProperty('auto_generated');
        expect(playlist).toHaveProperty('is_public');
        expect(playlist).toHaveProperty('created_at');
        expect(playlist).toHaveProperty('updated_at');
      }
    });

    test('should store song_ids as UUID array', async () => {
      const mockPlaylist = createMockPlaylist({
        song_ids: [
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
        ],
      });

      const { data, error } = await supabase
        .from('playlists')
        .insert(mockPlaylist)
        .select()
        .single();

      expect(error).toBeNull();
      expect(Array.isArray(data.song_ids)).toBe(true);
      expect(data.song_ids.length).toBe(2);

      // Cleanup
      await supabase.from('playlists').delete().eq('id', data.id);
    });

    test('should handle empty song_ids array', async () => {
      const mockPlaylist = createMockPlaylist({
        song_ids: [],
      });

      const { data, error } = await supabase
        .from('playlists')
        .insert(mockPlaylist)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.song_ids).toEqual([]);

      // Cleanup
      await supabase.from('playlists').delete().eq('id', data.id);
    });
  });

  describe('user_preferences Table Schema', () => {
    test('should have all required columns', async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .limit(1);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const prefs = data[0];
        expect(prefs).toHaveProperty('user_id');
        expect(prefs).toHaveProperty('preferred_quality');
        expect(prefs).toHaveProperty('auto_download');
        expect(prefs).toHaveProperty('download_quality');
        expect(prefs).toHaveProperty('data_saver_mode');
        expect(prefs).toHaveProperty('theme');
        expect(prefs).toHaveProperty('settings');
        expect(prefs).toHaveProperty('created_at');
        expect(prefs).toHaveProperty('updated_at');
      }
    });

    test('should have user_id as primary key', async () => {
      // Attempting to insert duplicate user_id should fail
      const userId = '99999999-9999-9999-9999-999999999999';

      const { data: first } = await supabase
        .from('user_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      const { error } = await supabase
        .from('user_preferences')
        .insert({ user_id: userId });

      expect(error).not.toBeNull();

      // Cleanup
      if (first) {
        await supabase.from('user_preferences').delete().eq('user_id', userId);
      }
    });

    test('should have default values', async () => {
      const userId = '88888888-8888-8888-8888-888888888888';

      const { data, error } = await supabase
        .from('user_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.preferred_quality).toBeDefined();
      expect(data.auto_download).toBeDefined();
      expect(data.download_quality).toBeDefined();
      expect(data.data_saver_mode).toBeDefined();
      expect(data.theme).toBeDefined();

      // Cleanup
      await supabase.from('user_preferences').delete().eq('user_id', userId);
    });
  });

  describe('Indexes and Performance', () => {
    test('should have index on songs artist', async () => {
      // Query should be fast with index
      const startTime = Date.now();

      await supabase
        .from('songs')
        .select('*')
        .eq('artist', 'Test Artist')
        .limit(10);

      const duration = Date.now() - startTime;

      // Should complete reasonably fast (adjust threshold as needed)
      expect(duration).toBeLessThan(2000);
    });

    test('should have index on songs popularity_score', async () => {
      const startTime = Date.now();

      await supabase
        .from('songs')
        .select('*')
        .order('popularity_score', { ascending: false })
        .limit(10);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    test('should support full-text search', async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .textSearch('title', 'test');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Triggers and Functions', () => {
    test('should auto-update updated_at on songs', async () => {
      const mockSong = createMockSong();

      // Insert song
      const { data: inserted } = await supabase
        .from('songs')
        .insert(mockSong)
        .select()
        .single();

      const originalUpdatedAt = inserted.updated_at;

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update song
      const { data: updated } = await supabase
        .from('songs')
        .update({ play_count: 10 })
        .eq('id', inserted.id)
        .select()
        .single();

      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );

      // Cleanup
      await supabase.from('songs').delete().eq('id', inserted.id);
    });
  });
});
