# 🚀 Quick Start Guide - Testing ML & Analytics

## Prerequisites

1. MongoDB Atlas account (free tier)
2. Node.js 20+ installed
3. Environment variables configured

## Step 1: Set Up MongoDB Atlas

```bash
# 1. Go to https://www.mongodb.com/atlas
# 2. Create free cluster (M0 Sandbox)
# 3. Create database user
# 4. Whitelist IP: 0.0.0.0/0 (or your specific IP)
# 5. Get connection string
```

## Step 2: Configure Environment

Add to `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/freeTune?retryWrites=true&w=majority
MONGODB_DB_NAME=freeTune
```

## Step 3: Start the Server

```bash
npm install
npm run dev
```

## Step 4: Test the Endpoints

### 1. Track a Listening Event

```bash
curl -X POST http://localhost:3000/api/v1/analytics/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "songId": "song_123",
    "playDuration": 180000,
    "songDuration": 210000,
    "skipped": false,
    "source": "playlist",
    "deviceType": "mobile",
    "networkType": "wifi",
    "quality": "high",
    "liked": true,
    "sessionId": "session_456",
    "sessionPosition": 1
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Listening event tracked successfully",
  "data": {
    "patternId": "507f1f77bcf86cd799439011"
  }
}
```

### 2. Get Personalized Recommendations

```bash
curl http://localhost:3000/api/v1/recommendations?limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Recommendations fetched successfully",
  "data": [
    {
      "songId": "song_789",
      "score": 0.87,
      "reason": "similar_features",
      "confidence": 0.85
    },
    ...
  ]
}
```

### 3. Get Similar Songs

```bash
curl http://localhost:3000/api/v1/recommendations/similar/song_123?limit=5 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Mood-Based Recommendations

```bash
curl http://localhost:3000/api/v1/recommendations/mood/happy?limit=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Get User Stats

```bash
curl http://localhost:3000/api/v1/analytics/stats?days=30 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalPlays": 456,
    "totalDuration": 82800000,
    "avgCompletionRate": 0.87,
    "skipRate": 0.13,
    "uniqueSongsCount": 123,
    "favoriteSource": "playlist"
  }
}
```

### 6. Get Top Songs

```bash
curl http://localhost:3000/api/v1/analytics/top-songs?limit=10&days=30 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Get Trending Songs

```bash
curl http://localhost:3000/api/v1/analytics/trending?genre=pop&limit=20&days=7
```

### 8. Get Genre Preferences

```bash
curl http://localhost:3000/api/v1/analytics/genre-preferences?days=30 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 9. Get Time Patterns

```bash
curl http://localhost:3000/api/v1/analytics/time-patterns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 5: Seed Test Data (Optional)

Create a seed script to populate initial data:

```javascript
// scripts/seed-ml-data.js
import mongoose from 'mongoose';
import { ListeningPattern, SongFeature } from '../src/database/models/index.js';

// Add sample songs with features
const sampleSongs = [
  {
    songId: 'song_001',
    energy: 0.8,
    valence: 0.7,
    danceability: 0.9,
    tempo: 120,
    primaryGenre: 'pop',
    mood: 'happy',
  },
  // ... more songs
];

// Add sample listening patterns
const samplePatterns = [
  {
    userId: 'user_001',
    songId: 'song_001',
    playDuration: 180000,
    completionRate: 0.85,
    source: 'playlist',
  },
  // ... more patterns
];

async function seed() {
  await SongFeature.insertMany(sampleSongs);
  await ListeningPattern.insertMany(samplePatterns);
  console.log('✓ Test data seeded');
}
```

Run:
```bash
node scripts/seed-ml-data.js
```

## Step 6: Test Background Jobs

Manually trigger jobs:

```javascript
import jobs from './src/jobs/analytics.jobs.js';

// Update popularity scores
await jobs.updatePopularityScores.handler();

// Refresh recommendations
await jobs.refreshRecommendations.handler();

// Calculate trending
await jobs.calculateTrendingSongs.handler();
```

## Step 7: Monitor MongoDB

Check MongoDB Atlas dashboard:

1. **Collections**
   - listening_patterns
   - song_features
   - recommendation_cache

2. **Indexes**
   - Should see all indexes created automatically

3. **Document Count**
   - Verify data is being created

4. **Query Performance**
   - Check slow query logs

## Troubleshooting

### MongoDB Connection Issues

```bash
# Test connection
node -e "
import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
console.log('✓ Connected');
process.exit(0);
"
```

### Missing User ID

If you get authentication errors:
1. Make sure JWT token is valid
2. Check `req.user.id` is populated by auth middleware
3. For testing, you can temporarily hardcode userId in controllers

### No Recommendations

If you get empty recommendations:
1. Make sure you have listening patterns tracked
2. Add some song features
3. Check logs for errors
4. Try refreshing with `?refresh=true`

### Slow Queries

If queries are slow:
1. Check indexes are created: `db.collection.getIndexes()`
2. Use `explain()` to analyze queries
3. Ensure you're using indexed fields in queries

## Production Deployment

### Vercel

Add cron endpoints:
```javascript
// api/cron/popularity.js
export default async function handler(req, res) {
  const { updatePopularityScores } = await import('../../src/jobs/analytics.jobs.js');
  await updatePopularityScores();
  res.json({ success: true });
}
```

Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/popularity",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Railway

Create `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/v1/healthcheck",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Add cron jobs via Railway dashboard.

## Monitoring

### Check Logs

```bash
# Development
npm run dev

# Production (Railway)
railway logs

# Vercel
vercel logs
```

### Key Metrics to Monitor

1. **API Response Times**
   - /recommendations: < 200ms (with cache)
   - /analytics/track: < 50ms

2. **Cache Hit Rate**
   - Recommendations: > 80%

3. **MongoDB Metrics**
   - Query execution time: < 100ms
   - Index usage: > 95%

4. **Background Jobs**
   - Success rate: > 99%
   - Execution time: < 5 minutes

## Next Steps

1. ✅ Test all endpoints
2. ✅ Seed test data
3. ✅ Verify MongoDB collections
4. ✅ Run background jobs
5. ✅ Monitor performance
6. ✅ Deploy to production
7. ✅ Set up cron jobs
8. ✅ Add more songs and features

## Need Help?

Check documentation:
- `docs/ML_ANALYTICS_README.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `MEMO.md` - Architecture overview

---

**Happy Testing! 🚀🎵**
