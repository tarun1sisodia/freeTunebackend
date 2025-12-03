/**
 * Run Migration Script
 * Adds album_art_url column to songs table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔧 Running migration: Add album_art_url column\n');

  try {
    // Read migration file
    const migrationSQL = fs.readFileSync(
      './src/database/migrations/002_add_album_art.sql',
      'utf8'
    );

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('');

    // Execute migration using Supabase REST API
    // Note: Supabase doesn't allow raw SQL via JS client for DDL
    // You need to run this manually in Supabase SQL Editor OR use pg client
    
    console.log('⚠️  Please run this SQL manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/[your-project]/sql/new\n');
    
    console.log('📋 Copy this SQL:');
    console.log('─────────────────────────────────────────────────────────');
    console.log('ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_art_url VARCHAR(500);');
    console.log('─────────────────────────────────────────────────────────');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }

  process.exit(0);
}

runMigration();
