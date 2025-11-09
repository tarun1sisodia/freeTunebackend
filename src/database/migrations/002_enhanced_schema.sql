-- FreeTune Database Schema v2 - Enhanced
-- PostgreSQL (Supabase)
-- Following MEMO.md specifications for ultra-performance music streaming

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- SONGS TABLE - Enhanced with additional metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    album_artist VARCHAR(255),
    
    -- Audio Details
    duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
    year INTEGER,
    genre VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    
    -- Storage & Quality
    r2_key VARCHAR(500) NOT NULL UNIQUE, -- Cloudflare R2 storage path
    file_sizes JSONB DEFAULT '{}', -- {"original": 28946239, "high": 7123241, ...}
    available_qualities TEXT[] DEFAULT ARRAY['high', 'medium', 'low'],
    
    -- Metadata & Features
    is_explicit BOOLEAN DEFAULT FALSE,
    lyrics_available BOOLEAN DEFAULT FALSE,
    cover_art_url TEXT,
    metadata JSONB DEFAULT '{}', -- ISRC, tags, etc.
    
    -- Analytics & Performance
    play_count INTEGER DEFAULT 0 CHECK (play_count >= 0),
    like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
    skip_count INTEGER DEFAULT 0 CHECK (skip_count >= 0),
    popularity_score DECIMAL(7,3) DEFAULT 0 CHECK (popularity_score >= 0),
    last_played_at TIMESTAMP WITH TIME ZONE,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete support
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            coalesce(title, '') || ' ' || 
            coalesce(artist, '') || ' ' || 
            coalesce(album, '') || ' ' ||
            coalesce(genre, '')
        )
    ) STORED
);

-- ============================================================================
-- USER INTERACTIONS - Enhanced tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    
    -- Interaction Details
    action_type VARCHAR(16) NOT NULL CHECK (action_type IN ('play', 'like', 'skip', 'download', 'share')),
    session_id UUID,
    
    -- Context Data (for recommendations)
    listened_duration_ms INTEGER, -- How much was actually played
    quality_used VARCHAR(16),
    device_type VARCHAR(50),
    network_type VARCHAR(20),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance
    CONSTRAINT fk_song FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

-- ============================================================================
-- PLAYLISTS - Enhanced with sharing support
-- ============================================================================
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Playlist Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    
    -- Songs & Settings
    song_ids UUID[] DEFAULT '{}',
    song_count INTEGER DEFAULT 0 CHECK (song_count >= 0),
    total_duration_ms BIGINT DEFAULT 0 CHECK (total_duration_ms >= 0),
    
    -- Attributes
    auto_generated BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    is_collaborative BOOLEAN DEFAULT FALSE, -- Future feature
    
    -- Analytics
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- USER PREFERENCES - Enhanced settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY,
    
    -- Playback Settings
    preferred_quality VARCHAR(16) DEFAULT 'high' CHECK (preferred_quality IN ('original', 'high', 'medium', 'low')),
    auto_play BOOLEAN DEFAULT TRUE,
    shuffle_mode BOOLEAN DEFAULT FALSE,
    repeat_mode VARCHAR(16) DEFAULT 'off' CHECK (repeat_mode IN ('off', 'one', 'all')),
    
    -- Download Settings
    auto_download BOOLEAN DEFAULT FALSE,
    download_quality VARCHAR(16) DEFAULT 'medium',
    download_over_wifi_only BOOLEAN DEFAULT TRUE,
    
    -- Data & Performance
    data_saver_mode BOOLEAN DEFAULT FALSE,
    prefetch_enabled BOOLEAN DEFAULT TRUE,
    cache_size_limit_mb INTEGER DEFAULT 1024,
    
    -- UI Preferences
    theme VARCHAR(16) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en',
    explicit_content_filter BOOLEAN DEFAULT FALSE,
    
    -- Advanced Settings
    settings JSONB DEFAULT '{}',
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LISTENING HISTORY - Separate table for history tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS listening_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    
    -- Playback Details
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_listened_ms INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    
    -- Context
    source VARCHAR(50), -- 'playlist', 'album', 'search', 'recommendation'
    source_id UUID,
    device_type VARCHAR(50),
    
    -- Index for fast queries
    CONSTRAINT idx_user_recent UNIQUE (user_id, played_at DESC, song_id)
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Songs indexes
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre) WHERE genre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_popularity ON songs(popularity_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_play_count ON songs(play_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_deleted ON songs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_search_vector ON songs USING GIN(search_vector);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_songs_artist_album ON songs(artist, album) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_genre_popularity ON songs(genre, popularity_score DESC) WHERE deleted_at IS NULL AND genre IS NOT NULL;

-- Fuzzy search support
CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON songs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_artist_trgm ON songs USING gin(artist gin_trgm_ops);

-- User interactions indexes
CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_song ON user_interactions(song_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON user_interactions(session_id) WHERE session_id IS NOT NULL;

-- Composite for analytics
CREATE INDEX IF NOT EXISTS idx_interactions_user_song ON user_interactions(user_id, song_id, action_type);

-- Playlists indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public, created_at DESC) WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playlists_auto ON playlists(user_id, auto_generated) WHERE auto_generated = TRUE;

-- Listening history indexes
CREATE INDEX IF NOT EXISTS idx_history_user_date ON listening_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_song ON listening_history(song_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_completed ON listening_history(user_id, completed) WHERE completed = TRUE;

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_songs_updated_at 
    BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at 
    BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update song counts in playlists
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

CREATE TRIGGER update_playlist_song_count
    BEFORE INSERT OR UPDATE OF song_ids ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_playlist_counts();

-- Update song statistics on interactions
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

CREATE TRIGGER update_song_statistics
    AFTER INSERT ON user_interactions
    FOR EACH ROW EXECUTE FUNCTION update_song_stats();

-- ============================================================================
-- HELPER VIEWS for common queries
-- ============================================================================

-- Popular songs view
CREATE OR REPLACE VIEW v_popular_songs AS
SELECT 
    id, title, artist, album, genre, duration_ms,
    play_count, like_count, popularity_score,
    cover_art_url, created_at
FROM songs
WHERE deleted_at IS NULL
ORDER BY popularity_score DESC, play_count DESC
LIMIT 100;

-- Recently added songs
CREATE OR REPLACE VIEW v_recent_songs AS
SELECT 
    id, title, artist, album, genre, duration_ms,
    play_count, cover_art_url, created_at
FROM songs
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE songs IS 'Stores song metadata with performance optimization for streaming';
COMMENT ON TABLE user_interactions IS 'Tracks all user actions for analytics and recommendations';
COMMENT ON TABLE playlists IS 'User and system-generated playlists with song arrays';
COMMENT ON TABLE user_preferences IS 'User-specific settings for playback and app behavior';
COMMENT ON TABLE listening_history IS 'Separate history tracking for better performance';

COMMENT ON COLUMN songs.r2_key IS 'Cloudflare R2 storage key for audio files';
COMMENT ON COLUMN songs.popularity_score IS 'Algorithm-driven popularity score (0-1000)';
COMMENT ON COLUMN songs.search_vector IS 'Auto-generated full-text search vector';

-- ============================================================================
-- INITIAL SYSTEM DATA (optional)
-- ============================================================================

-- You can add system playlists or default preferences here if needed

-- ============================================================================
-- NOTES:
-- 1. This schema is optimized for personal use with 10,000-50,000 songs
-- 2. All indexes are carefully chosen based on MEMO.md performance targets
-- 3. Soft deletes supported via deleted_at column
-- 4. Full-text search with both exact and fuzzy matching
-- 5. Statistics are automatically updated via triggers
-- 6. Views provide convenient access to common queries
-- ============================================================================
