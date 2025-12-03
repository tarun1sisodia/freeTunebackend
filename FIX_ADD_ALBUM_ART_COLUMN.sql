-- ═══════════════════════════════════════════════════════════════
-- FreeTune Database Fix: Add Missing album_art_url Column
-- ═══════════════════════════════════════════════════════════════
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" or press Ctrl+Enter
-- 
-- ═══════════════════════════════════════════════════════════════

-- Add album_art_url column to songs table
ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS album_art_url VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN songs.album_art_url IS 'URL to album artwork (stored in R2 or external CDN)';

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'songs' 
AND column_name = 'album_art_url';

-- Show updated table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'songs'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- Migration Complete! ✅
-- ═══════════════════════════════════════════════════════════════
