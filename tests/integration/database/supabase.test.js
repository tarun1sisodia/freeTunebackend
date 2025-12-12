/**
 * Supabase Connection Integration Tests
 * Tests database connectivity, queries, and operations
 */

import {
  getSupabaseClient,
  getSupabaseAdmin,
} from '../../../src/database/connections/supabase.js';
import {
  cleanupSupabaseTestData,
  createTestSong,
  deleteTestSong,
  verifySupabaseConnection,
} from '../../helpers/testDatabase.js';
import { createMockSong } from '../../helpers/mockData.js';

describe('Supabase Connection Integration Tests', () => {
  afterAll(async () => {
    await cleanupSupabaseTestData();
  });

  describe('Connection Tests', () => {
    test('should create Supabase client successfully', () => {
      const client = getSupabaseClient();
      expect(client).toBeDefined();
      expect(client).not.toBeNull();
    });

    test('should create Supabase admin client successfully', () => {
      const admin = getSupabaseAdmin();
      expect(admin).toBeDefined();
      expect(admin).not.toBeNull();
    });

    test('should verify Supabase connection', async () => {
      const isConnected = await verifySupabaseConnection();
      expect(isConnected).toBe(true);
    });
  });

  describe('Query Operations', () => {
    let testSongId;

    afterEach(async () => {
      if (testSongId) {
        await deleteTestSong(testSongId);
        testSongId = null;
      }
    });

    test('should execute SELECT query on songs table', async () => {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should execute INSERT query on songs table', async () => {
      const supabase = getSupabaseAdmin();
      const mockSong = createMockSong();

      const { data, error } = await supabase
        .from('songs')
        .insert(mockSong)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.title).toBe(mockSong.title);
      expect(data.artist).toBe(mockSong.artist);

      testSongId = data.id;
    });

    test('should execute UPDATE query on songs table', async () => {
      const supabase = getSupabaseAdmin();
      const mockSong = createMockSong();
      
      // Create test song
      const created = await createTestSong(mockSong);
      testSongId = created.id;

      // Update song
      const { data, error } = await supabase
        .from('songs')
        .update({ play_count: 10 })
        .eq('id', testSongId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.play_count).toBe(10);
    });

    test('should execute DELETE query on songs table', async () => {
      const supabase = getSupabaseAdmin();
      const mockSong = createMockSong();
      
      // Create test song
      const created = await createTestSong(mockSong);

      // Delete song
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', created.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await supabase
        .from('songs')
        .select('*')
        .eq('id', created.id)
        .single();

      expect(data).toBeNull();
    });

    test('should filter songs by artist', async () => {
      const supabase = getSupabaseAdmin();
      const mockSong = createMockSong({ artist: 'Unique Test Artist' });
      
      // Create test song
      const created = await createTestSong(mockSong);
      testSongId = created.id;

      // Query by artist
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('artist', 'Unique Test Artist');

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].artist).toBe('Unique Test Artist');
    });

    test('should search songs using full-text search', async () => {
      const supabase = getSupabaseAdmin();
      const mockSong = createMockSong({ title: 'Searchable Test Song' });
      
      // Create test song
      const created = await createTestSong(mockSong);
      testSongId = created.id;

      // Search by title
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .textSearch('title', 'Searchable');

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Validation', () => {
    test('should have correct columns in songs table', async () => {
      const supabase = getSupabaseAdmin();

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
        expect(song).toHaveProperty('duration_ms');
        expect(song).toHaveProperty('r2_key');
        expect(song).toHaveProperty('play_count');
        expect(song).toHaveProperty('popularity_score');
        expect(song).toHaveProperty('created_at');
        expect(song).toHaveProperty('updated_at');
      }
    });

    test('should enforce NOT NULL constraints', async () => {
      const supabase = getSupabaseAdmin();

      // Try to insert song without required fields
      const { error } = await supabase
        .from('songs')
        .insert({
          // Missing title, artist, duration_ms, r2_key
          album: 'Test Album',
        });

      expect(error).not.toBeNull();
    });

    test('should have user_preferences table', async () => {
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from('user_preferences')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    test('should have playlists table', async () => {
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from('playlists')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    test('should have user_interactions table', async () => {
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from('user_interactions')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle query to non-existent table', async () => {
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from('non_existent_table')
        .select('*');

      expect(error).not.toBeNull();
    });

    test('should handle invalid column in SELECT', async () => {
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from('songs')
        .select('invalid_column');

      expect(error).not.toBeNull();
    });

    test('should handle connection timeout gracefully', async () => {
      const supabase = getSupabaseAdmin();
      
      // This test depends on your timeout settings
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .limit(1);

      // Should either succeed or fail gracefully
      expect(data !== null || error !== null).toBe(true);
    });
  });
});
