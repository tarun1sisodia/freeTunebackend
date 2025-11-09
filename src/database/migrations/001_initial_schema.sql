-- FreeTune/Ultra-Performance Music Streaming App - Initial Schema Proposal
-- PostgreSQL (Supabase)

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SONGS TABLE
-- Stores only metadata (not the audio itself!)
-- File paths to Cloudflare R2 (all qualities), popularity, & algorithmic scores
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    duration_ms INTEGER NOT NULL,
    r2_key VARCHAR(500) NOT NULL, -- canonical storage path (R2 key)
    file_sizes JSONB DEFAULT '{}', -- e.g. {"original": 28946239, "high": 7123241, "medium": 3232401, "low": 1583230}
    play_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    popularity_score DECIMAL(7,3) DEFAULT 0, -- allows more headroom for ML scores
    metadata JSONB DEFAULT '{}',  -- any extra tags (ISRC, genre, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER INTERACTIONS
-- Only user_id, song_id, action_type ("play", "like", "skip", "download")
-- Used for analytics, prefetch logic, & generating recommendations
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    action_type VARCHAR(16) NOT NULL CHECK (action_type IN ('play', 'like', 'skip', 'download')),
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}' -- room for device, network, etc.
);

-- PLAYLISTS
-- Stores user & system-generated lists; does NOT normalize playlist songs (array only)
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    song_ids UUID[] DEFAULT '{}',
    auto_generated BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER PREFERENCES
-- Minimal, app-driven user settings for playback/quality
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY,
    preferred_quality VARCHAR(16) DEFAULT 'high',
    auto_download BOOLEAN DEFAULT FALSE,
    download_quality VARCHAR(16) DEFAULT 'medium',
    data_saver_mode BOOLEAN DEFAULT FALSE,
    theme VARCHAR(16) DEFAULT 'dark',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PERFORMANCE INDEXES: Search, popularity, "hot" data
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
CREATE INDEX IF NOT EXISTS idx_songs_popularity ON songs(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_songs_play_count ON songs(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_song_id ON user_interactions(song_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);

-- Full-text GIN index for ultra-fast search (title, artist, album)
CREATE INDEX IF NOT EXISTS idx_songs_search 
  ON songs USING gin(to_tsvector('english', title || ' ' || artist || ' ' || COALESCE(album, '')));

-- updated_at AUTO-UPDATER FUNCTION AND TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_songs_updated_at 
    BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at 
    BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: 
-- 1. Monetization, playlist sharing (social), advanced analytics, and ML cache are handled on external collections (e.g., MongoDB Atlas per MEMO.md).
-- 2. For streaming and search performance, hot/cold logic/caching is pushed to Upstash Redis, not represented here.
-- 3. For future features: if collaborative playlists, friend graph, or in-depth listening analytics are desired, new tables can be added.
-- 4. For personal/private use and maximum performance, this schema fully aligns with the MEMO.md's architectural intent and constraints. No further normalization or sharding is needed.
