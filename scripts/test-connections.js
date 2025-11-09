import config from '../src/config/index.js';
import { getSupabaseClient } from '../src/database/connections/supabase.js';
import { getRedisClient } from '../src/database/connections/redis.js';
import { getMongoClient } from '../src/database/connections/mongodb.js';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              FREETUNE BACKEND CONNECTION TEST                  ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function testConnections() {
  let allPassed = true;

  // Test 1: Configuration
  console.log('📋 Testing Configuration...');
  try {
    console.log(`   Environment: ${config.env}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   ✅ Configuration loaded\n`);
  } catch (error) {
    console.log(`   ❌ Configuration failed: ${error.message}\n`);
    allPassed = false;
  }

  // Test 2: Supabase Connection
  console.log('🗄️  Testing Supabase (PostgreSQL)...');
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('songs').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    console.log('   ✅ Supabase connected successfully');
    console.log('   ✅ Database tables accessible\n');
  } catch (error) {
    console.log(`   ❌ Supabase failed: ${error.message}\n`);
    allPassed = false;
  }

  // Test 3: Redis Connection
  console.log('⚡ Testing Redis (Upstash)...');
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.set('test_key', 'test_value');
      const value = await redis.get('test_key');
      await redis.del('test_key');
      
      if (value === 'test_value') {
        console.log('   ✅ Redis connected successfully');
        console.log('   ✅ Cache operations working\n');
      } else {
        throw new Error('Cache test failed');
      }
    } else {
      console.log('   ⚠️  Redis not configured (optional)\n');
    }
  } catch (error) {
    console.log(`   ❌ Redis failed: ${error.message}\n`);
    allPassed = false;
  }

  // Test 4: MongoDB Connection
  console.log('🍃 Testing MongoDB (Atlas)...');
  try {
    const db = await getMongoClient();
    if (db) {
      const collections = await db.listCollections().toArray();
      console.log('   ✅ MongoDB connected successfully');
      console.log(`   ✅ Database accessible (${collections.length} collections)\n`);
    } else {
      console.log('   ⚠️  MongoDB not configured (optional)\n');
    }
  } catch (error) {
    console.log(`   ⚠️  MongoDB warning: ${error.message}\n`);
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allPassed) {
    console.log('🎉 ALL CRITICAL TESTS PASSED!');
    console.log('\nYour backend is ready to use! 🚀');
    console.log('\nNext steps:');
    console.log('  1. Start server: npm run start');
    console.log('  2. Test: curl http://localhost:3000/health');
    console.log('  3. Start building features from TODO.md');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('\nPlease check:');
    console.log('  1. .env file has correct credentials');
    console.log('  2. All services are running');
    console.log('  3. Database migrations were run in Supabase');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(allPassed ? 0 : 1);
}

testConnections().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
