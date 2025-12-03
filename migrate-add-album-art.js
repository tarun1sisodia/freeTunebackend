/**
 * Database Migration Runner
 * Adds missing album_art_url column using PostgreSQL client
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Extract connection details from Supabase URL
const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)[1];

// Construct PostgreSQL connection string
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD || 'YOUR_DB_PASSWORD'}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

console.log('🔗 Connection details:');
console.log('   Project Ref:', projectRef);
console.log('');

async function runMigration() {
  console.log('🔧 Starting migration...\n');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check if column already exists
    console.log('1️⃣  Checking if album_art_url column exists...');
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'songs' 
      AND column_name = 'album_art_url';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  Column already exists! Skipping migration.\n');
      client.release();
      await pool.end();
      return;
    }

    console.log('✅ Column does not exist, proceeding with migration\n');

    // Add the column
    console.log('2️⃣  Adding album_art_url column...');
    const migrationQuery = `
      ALTER TABLE songs 
      ADD COLUMN album_art_url VARCHAR(500);
    `;

    await client.query(migrationQuery);
    console.log('✅ Column added successfully\n');

    // Verify the column was added
    console.log('3️⃣  Verifying migration...');
    const verifyResult = await client.query(checkQuery);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Migration verified successfully!\n');
      console.log('📊 Updated table structure:');
      
      const columnsQuery = `
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'songs'
        ORDER BY ordinal_position;
      `;
      
      const columns = await client.query(columnsQuery);
      columns.rows.forEach(col => {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`   - ${col.column_name}: ${col.data_type}${length}`);
      });
    } else {
      console.log('❌ Migration verification failed\n');
    }

    client.release();
    await pool.end();
    console.log('\n✨ Migration complete!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  FreeTune Database Migration: Add album_art_url');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

runMigration();
