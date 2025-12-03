/**
 * Test Redis Caching with Song Fetching
 * Tests cache hit/miss, TTL, and performance
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3000/api/v1';

// Initialize clients
const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

let authToken = null;

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'tarun1sisodia@gmail.com',
      password: 'T@run12345'
    })
  });

  const data = await response.json();
  if (data.success) {
    authToken = data.data.accessToken;
    console.log('✅ Login successful\n');
    return true;
  }
  console.error('❌ Login failed:', data);
  return false;
}

async function testRedisConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣  Testing Redis Connection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const pong = await redis.ping();
    console.log(`✅ Redis connected: ${pong}`);
    
    // Test basic operations
    await redis.set('test:key', 'test_value', { ex: 10 });
    const value = await redis.get('test:key');
    console.log(`✅ Redis write/read works: ${value}`);
    await redis.del('test:key');
    console.log('✅ Redis delete works\n');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
}

async function clearSongCaches() {
  console.log('🧹 Clearing existing song caches...');
  try {
    // Clear common cache keys
    const keysToDelete = [
      'popular:songs:page:1:limit:20',
      'hot:song:*',
    ];

    for (const key of keysToDelete) {
      await redis.del(key);
    }
    
    console.log('✅ Caches cleared\n');
  } catch (error) {
    console.warn('⚠️  Cache clear error:', error.message, '\n');
  }
}

async function fetchSongs(endpoint, description) {
  console.log(`📡 Fetching ${description}...`);
  const startTime = Date.now();
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const data = await response.json();
  const duration = Date.now() - startTime;
  
  return { data, duration };
}

async function testSongCaching() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣  Testing Song List Caching');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // First request (MISS - will query DB)
  console.log('📋 Request #1 (Cache MISS - should query database)');
  const { data: firstData, duration: firstDuration } = await fetchSongs(
    '/songs',
    'all songs'
  );
  
  console.log(`   Duration: ${firstDuration}ms`);
  console.log(`   Songs returned: ${firstData.data?.length || 0}`);
  console.log(`   Success: ${firstData.success}\n`);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));

  // Second request (HIT - should use cache)
  console.log('📋 Request #2 (Cache HIT - should use Redis)');
  const { data: secondData, duration: secondDuration } = await fetchSongs(
    '/songs',
    'all songs'
  );
  
  console.log(`   Duration: ${secondDuration}ms`);
  console.log(`   Songs returned: ${secondData.data?.length || 0}`);
  console.log(`   Success: ${secondData.success}`);
  
  // Performance comparison
  const improvement = ((firstDuration - secondDuration) / firstDuration * 100).toFixed(1);
  console.log(`\n⚡ Performance:`);
  console.log(`   First request (DB):    ${firstDuration}ms`);
  console.log(`   Second request (cache): ${secondDuration}ms`);
  console.log(`   Speed improvement:      ${improvement}%`);
  
  if (secondDuration < firstDuration) {
    console.log('   ✅ Cache is working!\n');
  } else {
    console.log('   ⚠️  Cache might not be working (second request not faster)\n');
  }
}

async function testPopularSongsCaching() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣  Testing Popular Songs Caching');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // First request
  console.log('📋 Request #1 (Cache MISS)');
  const { data: firstData, duration: firstDuration } = await fetchSongs(
    '/songs/popular',
    'popular songs'
  );
  
  console.log(`   Duration: ${firstDuration}ms`);
  console.log(`   Songs returned: ${firstData.data?.length || 0}\n`);

  await new Promise(resolve => setTimeout(resolve, 500));

  // Second request
  console.log('📋 Request #2 (Cache HIT)');
  const { data: secondData, duration: secondDuration } = await fetchSongs(
    '/songs/popular',
    'popular songs'
  );
  
  console.log(`   Duration: ${secondDuration}ms`);
  console.log(`   Songs returned: ${secondData.data?.length || 0}`);
  
  const improvement = ((firstDuration - secondDuration) / firstDuration * 100).toFixed(1);
  console.log(`\n⚡ Performance improvement: ${improvement}%`);
  
  if (secondDuration < firstDuration) {
    console.log('   ✅ Popular songs cache working!\n');
  } else {
    console.log('   ⚠️  Cache might not be working\n');
  }
}

async function testIndividualSongCaching() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣  Testing Individual Song Caching');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // First, get a song ID
  const { data: songsData } = await fetchSongs('/songs', 'songs list');
  
  if (!songsData.data || songsData.data.length === 0) {
    console.log('⚠️  No songs found, skipping individual song test\n');
    return;
  }

  const songId = songsData.data[0].id;
  console.log(`🎵 Testing with song ID: ${songId}`);

  // First request
  console.log('\n📋 Request #1 (Cache MISS)');
  const { data: firstData, duration: firstDuration } = await fetchSongs(
    `/songs/${songId}`,
    'single song'
  );
  
  console.log(`   Duration: ${firstDuration}ms`);
  console.log(`   Song: ${firstData.data?.title || 'N/A'}\n`);

  await new Promise(resolve => setTimeout(resolve, 500));

  // Second request
  console.log('📋 Request #2 (Cache HIT)');
  const { data: secondData, duration: secondDuration } = await fetchSongs(
    `/songs/${songId}`,
    'single song'
  );
  
  console.log(`   Duration: ${secondDuration}ms`);
  console.log(`   Song: ${secondData.data?.title || 'N/A'}`);
  
  const improvement = ((firstDuration - secondDuration) / firstDuration * 100).toFixed(1);
  console.log(`\n⚡ Performance improvement: ${improvement}%`);
  
  if (secondDuration < firstDuration) {
    console.log('   ✅ Individual song cache working!\n');
  } else {
    console.log('   ⚠️  Cache might not be working\n');
  }
}

async function inspectCacheKeys() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5️⃣  Inspecting Cache Keys');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check specific keys
    const keysToCheck = [
      'popular:songs:page:1:limit:20',
      'song:25dffd19-b06c-48b1-8c59-e0cd73099a5a', // First song ID
    ];

    for (const key of keysToCheck) {
      try {
        const value = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        if (value) {
          console.log(`✅ ${key}`);
          console.log(`   TTL: ${ttl}s`);
          console.log(`   Size: ${JSON.stringify(value).length} bytes\n`);
        } else {
          console.log(`❌ ${key} - not in cache\n`);
        }
      } catch (error) {
        console.log(`⚠️  ${key} - error: ${error.message}\n`);
      }
    }
  } catch (error) {
    console.error('❌ Error inspecting keys:', error.message, '\n');
  }
}

async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║        🎵 FreeTune Redis Caching Test Suite 🎵            ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Step 0: Login
    const loggedIn = await login();
    if (!loggedIn) {
      console.error('❌ Cannot proceed without authentication');
      process.exit(1);
    }

    // Step 1: Test Redis connection
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      console.error('❌ Cannot proceed without Redis connection');
      process.exit(1);
    }

    // Step 2: Clear caches
    await clearSongCaches();

    // Step 3: Test song list caching
    await testSongCaching();

    // Step 4: Test popular songs caching
    await testPopularSongsCaching();

    // Step 5: Test individual song caching
    await testIndividualSongCaching();

    // Step 6: Inspect cache keys
    await inspectCacheKeys();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests completed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

runTests();
