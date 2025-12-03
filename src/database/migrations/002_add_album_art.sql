-- Migration to add album_art_url column to songs table
-- Run this if you already have the songs table created

ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS album_art_url VARCHAR(500);

-- Add comment
COMMENT ON COLUMN songs.album_art_url IS 'URL to album artwork stored in R2 or external CDN';
