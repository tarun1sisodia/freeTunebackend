import fs from 'fs';
import { openAsBlob } from 'fs'; // Node 20+
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_SONGS_DIR = path.join(__dirname, '../../src/songs_local');
const API_URL = 'http://localhost:3000/api/v1'; // Adjust if port is different

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

async function runVerification() {
    log('\n🚀 Starting Full System Verification...\n', colors.bold);

    // 1. Check Configuration
    log('1. Checking Configuration...', colors.blue);
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'REDIS_URL', 'REDIS_TOKEN', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        log(`❌ Missing environment variables: ${missingVars.join(', ')}`, colors.red);
        process.exit(1);
    }
    log('✅ Configuration present', colors.green);

    // 2. Initializing Clients
    log('\n2. Initializing Clients...', colors.blue);
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const redis = new Redis({ url: process.env.REDIS_URL, token: process.env.REDIS_TOKEN });
    const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
    });

    // 2a. Connectivity Checks
    log('\n2a. Connectivity Checks...', colors.blue);

    // Redis Check
    let redisConnected = false;
    try {
        const pong = await redis.ping();
        if (pong === 'PONG') {
            log('✅ Redis connection successful (PING Check)', colors.green);
            redisConnected = true;
        } else {
            log(`❌ Redis PING returned unexpected value: ${pong}`, colors.red);
        }
    } catch (err) {
        log(`❌ Redis connection failed: ${err.message}`, colors.red);
    }

    // R2 Check
    let r2Connected = false;
    try {
        const listCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            MaxKeys: 1
        });
        await s3.send(listCmd);
        log(`✅ R2 connection successful (Bucket access confirmed)`, colors.green);
        r2Connected = true;
    } catch (err) {
        log(`❌ R2 connection failed: ${err.message}`, colors.red);
        if (err.name === 'InvalidAccessKeyId' || err.code === 'InvalidAccessKeyId') {
            log(`   -> Hint: Your Access Key ID might be incorrect.`, colors.yellow);
        } else if (err.name === 'SignatureDoesNotMatch' || err.code === 'SignatureDoesNotMatch') {
            log(`   -> Hint: Your Secret Access Key might be incorrect.`, colors.yellow);
        } else if (err.statusCode === 403) { // Use statusCode for newer generic errors
            log(`   -> Hint: Credentials rejected (403 Forbidden).`, colors.yellow);
        }
    }

    if (!r2Connected) {
        log('\n⚠️  Skipping Upload Test due to R2 connection failure.', colors.yellow);
        process.exit(1);
    }

    // 3. Authenticate
    log('\n3. Authenticating...', colors.blue);
    let token;
    let userId;
    const testEmail = `tarun1sisodia@gmail.com`;
    const testPassword = 'T@run12345';

    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
        });

        if (error) throw error;
        if (!data.session) {
            // Try logging in if user exists (shouldn't happen with unique email but just in case)
            const login = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });
            if (login.error) throw login.error;
            token = login.data.session.access_token;
            userId = login.data.user.id;
        } else {
            token = data.session.access_token;
            userId = data.user.id;
        }
        log(`✅ Authenticated as ${testEmail}`, colors.green);
    } catch (err) {
        log(`❌ Authentication failed: ${err.message}`, colors.red);
        process.exit(1);
    }

    // 4. Select Song
    log('\n4. Selecting Song...', colors.blue);
    let songFile;
    try {
        const files = fs.readdirSync(LOCAL_SONGS_DIR).filter(f => f.endsWith('.mp3'));
        if (files.length === 0) throw new Error('No .mp3 files found in src/songs_local');
        songFile = files[0];
        log(`✅ Selected: ${songFile}`, colors.green);
    } catch (err) {
        log(`❌ Song selection failed: ${err.message}`, colors.red);
        process.exit(1);
    }

    // 5. Upload Song
    log('\n5. Uploading Song (this may take a moment)...', colors.blue);
    let songId;
    let r2Key;
    try {
        const filePath = path.join(LOCAL_SONGS_DIR, songFile);

        // Use Node.js global File/Blob handling
        // We need to read as a Blob for standard FormData
        // Or use fs.openAsBlob if available (Node 20+)
        // Fallback to reading buffer and creating Blob if openAsBlob is elusive in some envs
        const fileContent = fs.readFileSync(filePath);
        const blob = new Blob([fileContent], { type: 'audio/mpeg' });

        const form = new FormData();
        form.append('audio', blob, songFile);
        form.append('title', 'Test Song ' + Date.now());
        form.append('artist', 'Test Artist');
        form.append('duration_ms', '180000'); // Dummy duration

        // With global fetch + FormData, we MUST NOT set Content-Type header manually
        const response = await fetch(`${API_URL}/songs/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: form
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Upload failed: ${JSON.stringify(result)}`);
        }

        songId = result.data.song.id;
        r2Key = result.data.song.r2_key;
        log(`✅ Upload successful! Song ID: ${songId}`, colors.green);
        log(`ℹ️  R2 Key: ${r2Key}`, colors.yellow);
    } catch (err) {
        log(`❌ Upload failed: ${err.message}`, colors.red);
        // Don't exit, try to debug
    }

    if (songId) {
        // 6. Verify Supabase
        log('\n6. Verifying Supabase Record...', colors.blue);
        const { data: dbSong, error: dbError } = await supabase.from('songs').select('*').eq('id', songId).single();
        if (dbError || !dbSong) {
            log(`❌ Song not found in Supabase: ${dbError?.message}`, colors.red);
        } else {
            log('✅ Song record found in DB', colors.green);
        }

        // 7. Verify Redis
        log('\n7. Verifying Redis Cache...', colors.blue);
        // Wait a moment for cache to populate if async
        await new Promise(r => setTimeout(r, 1000));
        // Note: Cache key format might vary, checking expected keys
        const cacheKeys = [`song:${songId}`, `songs:all`, `songs:recent`];
        let foundCache = false;
        for (const key of cacheKeys) {
            const exists = await redis.exists(key);
            if (exists) {
                log(`✅ Cache hit for key: ${key}`, colors.green);
                foundCache = true;
            }
        }
        if (!foundCache) log('⚠️  No specific cache keys found immediately (might be lazy loaded)', colors.yellow);

        // 8. Verify R2 & HLS
        log('\n8. Verifying R2 Storage & HLS...', colors.blue);
        try {
            // Check Original File
            await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: r2Key }));
            log('✅ Original file confirmed in R2', colors.green);

            // Check for HLS folder/files
            // Assuming HLS might be stored in a 'hls/' folder or related to the ID/Key
            // We search for any keys containing the filename base or ID
            const listCmd = new ListObjectsV2Command({
                Bucket: process.env.R2_BUCKET_NAME,
                Prefix: 'hls/' // Common convention, adjusting based on exploration
            });
            const listRes = await s3.send(listCmd);
            const hlsFiles = listRes.Contents?.filter(c => c.Key.includes(songId) || c.Key.includes(path.basename(r2Key, '.mp3'))) || [];

            if (hlsFiles.length > 0) {
                log(`✅ HLS artifacts found (${hlsFiles.length} files)`, colors.green);
                hlsFiles.slice(0, 3).forEach(f => log(`   - ${f.Key}`, colors.blue));
            } else {
                log('❌ No HLS (m3u8/ts) files found for this upload.', colors.red);
                log('ℹ️  Interpretation: The backend uploaded the original MP3 but did not trigger HLS transcoding.', colors.yellow);
            }

        } catch (err) {
            log(`❌ R2 verification failed: ${err.message}`, colors.red);
        }
    }

    log('\n🏁 Verification Complete.', colors.bold);

    // Cleanup User (Optional)
    if (userId) {
        log('\n🧹 Cleanup: Deleting test user...', colors.blue);
        // Note: Client can't delete user usually, needs Service Role. 
        // We skip this to avoid needing admin key in this script, or use if available.
        log('Skipping user cleanup (requires admin privileges).', colors.yellow);
    }
}

runVerification().catch(err => console.error(err));
