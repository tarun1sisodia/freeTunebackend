-- Migration to enable Row Level Security (RLS) on songs table
-- Created to address security advisory while maintaining existing application flow

-- 1. Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy for Public Read Access
-- Allows any user (authenticated or anonymous) to view songs
-- This matches the "public" nature of the song metadata
CREATE POLICY "Enable read access for all users" ON songs
FOR SELECT
USING (true);

-- 3. Create Policy for Authenticated Write Access
-- Allows authenticated users to Perform INSERT, UPDATE, DELETE
-- This ensures the existing controllers (which use the authenticated client) continue to work
-- While preventing anonymous/unauthorized modifications
CREATE POLICY "Enable full access for authenticated users" ON songs
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Note:
-- The 'uploadSong' controller uses the Service Role (Admin) client, which bypasses RLS entirely.
-- The 'updateSongMetadata' and 'deleteSong' controllers use the Standard Client (Authenticated),
-- so they rely on the "Enable full access for authenticated users" policy to function.
