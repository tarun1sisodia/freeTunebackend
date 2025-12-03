/**
 * Check RLS and Query Songs Directly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkRLS() {
  console.log('🔍 Checking Row Level Security (RLS)...\n');

  // Test with anon key (what the API uses)
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Test with service role (bypasses RLS)
  const supabaseService = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: Query with ANON key (what API uses)
    console.log('1️⃣  Testing with ANON key (API uses this)...');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('songs')
      .select('*');

    if (anonError) {
      console.error('❌ ANON query failed:', anonError.message);
      console.error('   Details:', anonError);
    } else {
      console.log(`✅ ANON query returned: ${anonData.length} songs`);
      if (anonData.length === 0) {
        console.log('⚠️  This means RLS is blocking queries!');
      }
    }

    // Test 2: Query with SERVICE ROLE (bypasses RLS)
    console.log('\n2️⃣  Testing with SERVICE ROLE key (bypasses RLS)...');
    const { data: serviceData, error: serviceError } = await supabaseService
      .from('songs')
      .select('*');

    if (serviceError) {
      console.error('❌ SERVICE query failed:', serviceError.message);
    } else {
      console.log(`✅ SERVICE query returned: ${serviceData.length} songs`);
    }

    // Test 3: Check if RLS is enabled
    console.log('\n3️⃣  Checking RLS policies...');
    const { data: policies, error: policyError } = await supabaseService
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'songs');

    if (!policyError && policies) {
      console.log(`📋 Found ${policies.length} RLS policies on songs table`);
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd}`);
      });
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DIAGNOSIS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (serviceData.length > 0 && anonData.length === 0) {
      console.log('');
      console.log('🔴 PROBLEM IDENTIFIED:');
      console.log('   Row Level Security (RLS) is ENABLED on songs table');
      console.log('   and blocking authenticated queries!');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('   You need to either:');
      console.log('   1. DISABLE RLS on songs table (quick fix), OR');
      console.log('   2. ADD RLS policies to allow SELECT (proper fix)');
      console.log('');
      console.log('🔧 QUICK FIX SQL:');
      console.log('   ALTER TABLE songs DISABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('🔧 PROPER FIX SQL (allow all authenticated users):');
      console.log('   CREATE POLICY "Enable read access for all users"');
      console.log('   ON songs FOR SELECT TO public USING (true);');
      console.log('');
    } else if (anonData.length > 0) {
      console.log('');
      console.log('✅ RLS is not blocking queries - songs are accessible!');
      console.log('');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }

  process.exit(0);
}

checkRLS();
