-- ═══════════════════════════════════════════════════════════════
-- FreeTune Database Fix: RLS Policies for Songs Table
-- ═══════════════════════════════════════════════════════════════
-- 
-- PROBLEM: Row Level Security (RLS) is blocking song queries
-- SOLUTION: Add proper RLS policies OR disable RLS
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard SQL Editor
-- 2. Copy ONE of the solutions below
-- 3. Run it
-- 
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- OPTION 1: QUICK FIX - Disable RLS (Not recommended for production)
-- ═══════════════════════════════════════════════════════════════

-- Disable RLS on songs table (allows all access)
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;

-- Also add the missing column while we're here
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_art_url VARCHAR(500);


-- ═══════════════════════════════════════════════════════════════
-- OPTION 2: PROPER FIX - Enable RLS with Public Read Access
-- ═══════════════════════════════════════════════════════════════

-- First, make sure RLS is enabled
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON songs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON songs;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON songs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON songs;

-- Allow anyone to read songs (public content)
CREATE POLICY "Enable read access for all users"
  ON songs
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert songs
CREATE POLICY "Enable insert for authenticated users"
  ON songs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update songs
CREATE POLICY "Enable update for authenticated users"
  ON songs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete songs
CREATE POLICY "Enable delete for authenticated users"
  ON songs
  FOR DELETE
  TO authenticated
  USING (true);

-- Add the missing column
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_art_url VARCHAR(500);


-- ═══════════════════════════════════════════════════════════════
-- OPTION 3: SECURED FIX - Only Authenticated Users
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON songs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON songs;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON songs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON songs;

-- Only authenticated users can read
CREATE POLICY "Enable read for authenticated users"
  ON songs
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert
CREATE POLICY "Enable insert for authenticated users"
  ON songs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "Enable update for authenticated users"
  ON songs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Enable delete for authenticated users"
  ON songs
  FOR DELETE
  TO authenticated
  USING (true);

-- Add the missing column
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_art_url VARCHAR(500);


-- ═══════════════════════════════════════════════════════════════
-- Verification Queries
-- ═══════════════════════════════════════════════════════════════

-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'songs';

-- View all policies on songs table
SELECT * FROM pg_policies WHERE tablename = 'songs';

-- Test query (should work now)
SELECT COUNT(*) as total_songs FROM songs;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Recommended: Use OPTION 2 (Public Read Access)
-- ═══════════════════════════════════════════════════════════════
