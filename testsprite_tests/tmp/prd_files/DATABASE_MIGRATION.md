# 🗄️ Database Migration Instructions

## Current Status

You have two schema versions:
- **`001_initial_schema.sql`** - Already applied to Supabase ✅
- **`002_enhanced_schema.sql`** - NEW enhanced version 🆕

## Option A: Fresh Start (Recommended if no important data)

### Step 1: Drop Old Tables
```sql
-- Run this in Supabase SQL Editor
DROP TABLE IF EXISTS listening_history CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS songs CASCADE;

DROP VIEW IF EXISTS v_popular_songs;
DROP VIEW IF EXISTS v_recent_songs;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS update_playlist_counts CASCADE;
DROP FUNCTION IF EXISTS update_song_stats CASCADE;
```

### Step 2: Apply Enhanced Schema
```sql
-- Copy entire content from:
-- src/database/migrations/002_enhanced_schema.sql
-- and run it in Supabase SQL Editor
```

### Step 3: Verify
```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## Option B: Incremental Migration (If you have data to preserve)

### Migration Script from v1 to v2

```sql
-- BACKUP YOUR DATA FIRST!
-- This is a destructive operation

BEGIN;

-- 1. Add new columns to songs table
ALTER TABLE songs 
  ADD COLUMN IF NOT EXISTS album_artist VARCHAR(255),
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS genre VARCHAR(100),
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS available_qualities TEXT[] DEFAULT ARRAY['high', 'medium', 'low'],
  ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lyrics_available BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cover_art_url TEXT,
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
  ADD COLUMN IF NOT EXISTS skip_count INTEGER DEFAULT 0 CHECK (skip_count >= 0),
  ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update popularity_score precision
ALTER TABLE songs ALTER COLUMN popularity_score TYPE DECIMAL(7,3);

-- Add unique constraint to r2_key
ALTER TABLE songs ADD CONSTRAINT songs_r2_key_unique UNIQUE (r2_key);

-- Add search vector (generated column)
ALTER TABLE songs 
  ADD COLUMN IF NOT EXISTS search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(title, '') || ' ' || 
      coalesce(artist, '') || ' ' || 
      coalesce(album, '') || ' ' ||
      coalesce(genre, '')
    )
  ) STORED;

-- 2. Add new columns to user_interactions
ALTER TABLE user_interactions
  ADD COLUMN IF NOT EXISTS listened_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS quality_used VARCHAR(16),
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS network_type VARCHAR(20);

-- Update action_type to include 'share'
ALTER TABLE user_interactions 
  DROP CONSTRAINT IF EXISTS user_interactions_action_type_check;

ALTER TABLE user_interactions
  ADD CONSTRAINT user_interactions_action_type_check 
  CHECK (action_type IN ('play', 'like', 'skip', 'download', 'share'));

-- 3. Add new columns to playlists
ALTER TABLE playlists
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS song_count INTEGER DEFAULT 0 CHECK (song_count >= 0),
  ADD COLUMN IF NOT EXISTS total_duration_ms BIGINT DEFAULT 0 CHECK (total_duration_ms >= 0),
  ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update song_count for existing playlists
UPDATE playlists SET song_count = array_length(song_ids, 1) WHERE song_ids IS NOT NULL;

-- 4. Enhance user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS auto_play BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS shuffle_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS repeat_mode VARCHAR(16) DEFAULT 'off' CHECK (repeat_mode IN ('off', 'one', 'all')),
  ADD COLUMN IF NOT EXISTS download_over_wifi_only BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS prefetch_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS cache_size_limit_mb INTEGER DEFAULT 1024,
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS explicit_content_filter BOOLEAN DEFAULT FALSE;

-- Update quality constraints
ALTER TABLE user_preferences 
  DROP CONSTRAINT IF EXISTS user_preferences_preferred_quality_check;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_preferred_quality_check 
  CHECK (preferred_quality IN ('original', 'high', 'medium', 'low'));

ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_theme_check;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_theme_check 
  CHECK (theme IN ('light', 'dark', 'auto'));

-- 5. Create listening_history table
CREATE TABLE IF NOT EXISTS listening_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_listened_ms INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    source VARCHAR(50),
    source_id UUID,
    device_type VARCHAR(50)
);

-- 6. Drop old indexes
DROP INDEX IF EXISTS idx_songs_search;

-- 7. Create new indexes
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre) WHERE genre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_deleted ON songs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_search_vector ON songs USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_songs_artist_album ON songs(artist, album) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_genre_popularity ON songs(genre, popularity_score DESC) WHERE deleted_at IS NULL AND genre IS NOT NULL;

-- Install pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON songs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_artist_trgm ON songs USING gin(artist gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON user_interactions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_user_song ON user_interactions(user_id, song_id, action_type);

CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public, created_at DESC) WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playlists_auto ON playlists(user_id, auto_generated) WHERE auto_generated = TRUE;

CREATE INDEX IF NOT EXISTS idx_history_user_date ON listening_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_song ON listening_history(song_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_completed ON listening_history(user_id, completed) WHERE completed = TRUE;

-- 8. Create/Update functions
CREATE OR REPLACE FUNCTION update_playlist_counts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.song_count = array_length(NEW.song_ids, 1);
    IF NEW.song_count IS NULL THEN
        NEW.song_count = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_song_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action_type = 'play' THEN
        UPDATE songs SET 
            play_count = play_count + 1,
            last_played_at = NEW.created_at
        WHERE id = NEW.song_id;
    ELSIF NEW.action_type = 'like' THEN
        UPDATE songs SET like_count = like_count + 1 WHERE id = NEW.song_id;
    ELSIF NEW.action_type = 'skip' THEN
        UPDATE songs SET skip_count = skip_count + 1 WHERE id = NEW.song_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create/Update triggers
DROP TRIGGER IF EXISTS update_playlist_song_count ON playlists;
CREATE TRIGGER update_playlist_song_count
    BEFORE INSERT OR UPDATE OF song_ids ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_playlist_counts();

DROP TRIGGER IF EXISTS update_song_statistics ON user_interactions;
CREATE TRIGGER update_song_statistics
    AFTER INSERT ON user_interactions
    FOR EACH ROW EXECUTE FUNCTION update_song_stats();

-- 10. Create views
CREATE OR REPLACE VIEW v_popular_songs AS
SELECT 
    id, title, artist, album, genre, duration_ms,
    play_count, like_count, popularity_score,
    cover_art_url, created_at
FROM songs
WHERE deleted_at IS NULL
ORDER BY popularity_score DESC, play_count DESC
LIMIT 100;

CREATE OR REPLACE VIEW v_recent_songs AS
SELECT 
    id, title, artist, album, genre, duration_ms,
    play_count, cover_art_url, created_at
FROM songs
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- 11. Add comments
COMMENT ON TABLE songs IS 'Stores song metadata with performance optimization for streaming';
COMMENT ON TABLE user_interactions IS 'Tracks all user actions for analytics and recommendations';
COMMENT ON TABLE playlists IS 'User and system-generated playlists with song arrays';
COMMENT ON TABLE user_preferences IS 'User-specific settings for playback and app behavior';
COMMENT ON TABLE listening_history IS 'Separate history tracking for better performance';

COMMENT ON COLUMN songs.r2_key IS 'Cloudflare R2 storage key for audio files';
COMMENT ON COLUMN songs.popularity_score IS 'Algorithm-driven popularity score (0-1000)';
COMMENT ON COLUMN songs.search_vector IS 'Auto-generated full-text search vector';

COMMIT;

-- VERIFY THE MIGRATION
SELECT 'Songs columns:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'songs' AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## Post-Migration Verification

```sql
-- Count tables
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Should return: 5

-- Count indexes
SELECT COUNT(*) as index_count 
FROM pg_indexes 
WHERE schemaname = 'public';
-- Should return: 25+

-- Test insert
INSERT INTO songs (title, artist, duration_ms, r2_key, genre, year) 
VALUES ('Test Song', 'Test Artist', 180000, 'test/song.mp3', 'Rock', 2024);

-- Verify search vector generated automatically
SELECT title, search_vector 
FROM songs 
WHERE title = 'Test Song';

-- Clean up test
DELETE FROM songs WHERE title = 'Test Song';
```

---

## Rollback (If Something Goes Wrong)

```sql
-- If you used BEGIN/COMMIT, you can ROLLBACK instead
ROLLBACK;

-- If already committed, restore from backup
-- Make sure you have a backup before starting!
```

---

## 🎯 Recommendation

**For your situation (fresh setup, no production data):**

✅ **Use Option A** - Fresh start with enhanced schema
- Cleaner
- Faster
- No migration complexity
- Already ran basic schema once

Just drop the old tables and apply `002_enhanced_schema.sql`!

---

## Need Help?

If you encounter any issues:
1. Check Supabase logs
2. Verify extension support (uuid-ossp, pg_trgm)
3. Check PostgreSQL version (15+ recommended)
4. Ensure sufficient permissions

Ready to apply the migration? 🚀
