/**
 * Database Debugging Script
 * Tests Supabase connection and checks if songs exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugDatabase() {
  console.log('🔍 Starting database debug...\n');

  try {
    // 1. Test connection
    console.log('1️⃣  Testing Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('songs')
      .select('count');
    
    if (healthError) {
      console.error('❌ Connection failed:', healthError.message);
      return;
    }
    console.log('✅ Connection successful\n');

    // 2. Count total songs
    console.log('2️⃣  Counting songs...');
    const { count, error: countError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count failed:', countError.message);
    } else {
      console.log(`✅ Total songs in database: ${count}\n`);
    }

    // 3. Fetch all songs
    console.log('3️⃣  Fetching all songs...');
    const { data: songs, error: fetchError } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Fetch failed:', fetchError.message);
    } else {
      console.log(`✅ Fetched ${songs.length} songs\n`);
      
      if (songs.length > 0) {
        console.log('📋 Song details:');
        songs.forEach((song, index) => {
          console.log(`\n   ${index + 1}. ${song.title} - ${song.artist}`);
          console.log(`      ID: ${song.id}`);
          console.log(`      Album: ${song.album || 'N/A'}`);
          console.log(`      Duration: ${song.duration_ms}ms`);
          console.log(`      R2 Key: ${song.r2_key}`);
          console.log(`      Play Count: ${song.play_count}`);
          console.log(`      Created: ${song.created_at}`);
        });
      } else {
        console.log('⚠️  No songs found in database');
      }
    }

    // 4. Check table structure
    console.log('\n4️⃣  Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('songs')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table check failed:', tableError.message);
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Table columns:');
      console.log(Object.keys(tableInfo[0]).join(', '));
    }

    // 5. Check user_interactions
    console.log('\n5️⃣  Checking user interactions...');
    const { count: interactionCount, error: interactionError } = await supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true });

    if (interactionError) {
      console.error('❌ Interactions check failed:', interactionError.message);
    } else {
      console.log(`✅ Total interactions: ${interactionCount}`);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }

  console.log('\n✨ Debug complete!\n');
  process.exit(0);
}

debugDatabase();
