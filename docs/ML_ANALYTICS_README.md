# 🎵 FreeTune ML & Analytics Implementation

## Overview

This implementation adds **Machine Learning-powered recommendations** and **advanced analytics** to the FreeTune backend, as outlined in MEMO.md and MEMO_IMPROVEMENTS.md.

## 📊 MongoDB Schema Models

### 1. ListeningPattern Model
Tracks individual listening events for ML training and analytics.

**Key Features:**
- Completion rate tracking
- Skip detection
- Context awareness (time, device, network)
- Session tracking
- User engagement metrics

**Use Cases:**
- Generate personalized recommendations
- Calculate song popularity
- Analyze listening habits
- Time-based recommendations

### 2. SongFeature Model
Stores audio features and metadata for content-based recommendations.

**Key Features:**
- Audio features (energy, valence, danceability, tempo, etc.)
- Genre and mood classification
- Popularity and trending scores
- Engagement metrics
- Similar song computation

**Use Cases:**
- Content-based filtering
- Find similar songs
- Genre/mood playlists
- Trending calculations

### 3. RecommendationCache Model
Pre-computed recommendation results with performance tracking.

**Key Features:**
- Multiple recommendation types
- Algorithm metadata
- Engagement tracking (views, plays, likes, skips)
- Auto-expiration (TTL)
- Stale detection for refresh

**Use Cases:**
- Fast recommendation delivery
- A/B testing algorithms
- Performance monitoring
- Cache invalidation

## 🤖 ML Services

### AnalyticsService
Handles listening pattern tracking and metrics calculation.

**Methods:**
- `trackListening()` - Track a listening event
- `updateSongMetrics()` - Update song popularity from patterns
- `getUserStats()` - Get user listening statistics
- `getUserTopSongs()` - Get user's most played songs
- `getUserTimePatterns()` - Identify listening time patterns
- `getUserGenrePreferences()` - Calculate genre preferences
- `getUserMoodPreferences()` - Calculate mood preferences
- `getTrendingSongs()` - Get globally trending songs
- `calculatePopularityScores()` - Batch update popularity

### RecommendationService
Hybrid recommendation engine combining multiple algorithms.

**Algorithms:**
1. **Content-Based Filtering (40%)**: Uses audio features similarity
2. **Collaborative Filtering (30%)**: Based on similar users
3. **Trending (20%)**: Popular songs globally
4. **Time Context (10%)**: Based on listening time patterns

**Methods:**
- `getPersonalizedRecommendations()` - Main recommendation endpoint
- `generateHybridRecommendations()` - Hybrid algorithm
- `getContentBasedRecommendations()` - Audio feature similarity
- `getCollaborativeRecommendations()` - User similarity
- `getTrendingRecommendations()` - Trending songs
- `getTimeContextRecommendations()` - Time-based recommendations
- `getSimilarSongs()` - Find similar songs to a specific song
- `getMoodBasedRecommendations()` - Mood-based playlists
- `trackEngagement()` - Track recommendation performance
- `refreshStaleRecommendations()` - Background refresh job

## 🛣️ API Endpoints

### Analytics Endpoints

```
POST   /api/v1/analytics/track
       - Track a listening event

GET    /api/v1/analytics/stats
       - Get user listening statistics
       Query: ?days=30

GET    /api/v1/analytics/top-songs
       - Get user's top songs
       Query: ?limit=20&days=30

GET    /api/v1/analytics/time-patterns
       - Get user's listening time patterns

GET    /api/v1/analytics/genre-preferences
       - Get user's genre preferences
       Query: ?days=30

GET    /api/v1/analytics/mood-preferences
       - Get user's mood preferences
       Query: ?days=30

GET    /api/v1/analytics/trending
       - Get global trending songs
       Query: ?genre=pop&limit=20&days=7
```

### Recommendation Endpoints

```
GET    /api/v1/recommendations
       - Get personalized recommendations
       Query: ?limit=20&refresh=false

GET    /api/v1/recommendations/similar/:songId
       - Get similar songs
       Query: ?limit=20

GET    /api/v1/recommendations/mood/:mood
       - Get mood-based recommendations
       Query: ?limit=20
       Moods: happy, sad, energetic, calm, romantic, etc.

GET    /api/v1/recommendations/trending
       - Get trending songs
       Query: ?genre=pop&limit=20&days=7

GET    /api/v1/recommendations/stats
       - Get user listening stats

GET    /api/v1/recommendations/top
       - Get user's top songs
       Query: ?limit=20&days=30
```

## 📈 Background Jobs

Located in `/src/jobs/analytics.jobs.js`

### Job Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| `updatePopularityScores` | Daily at 2 AM | Calculate popularity for all songs |
| `refreshRecommendations` | Every hour | Refresh stale recommendation caches |
| `cleanupOldPatterns` | Weekly (Sun 3 AM) | Cleanup old data (handled by TTL) |
| `calculateTrendingSongs` | Every hour | Update trending song lists |

### Setup Cron Jobs

**Railway:**
```bash
# Add to railway.json
{
  "crons": [
    {
      "schedule": "0 2 * * *",
      "command": "node src/jobs/runner.js updatePopularityScores"
    },
    {
      "schedule": "0 * * * *",
      "command": "node src/jobs/runner.js refreshRecommendations"
    }
  ]
}
```

**Vercel:**
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/popularity",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/recommendations",
      "schedule": "0 * * * *"
    }
  ]
}
```

## 🔧 Usage Examples

### Track Listening Event

```javascript
POST /api/v1/analytics/track
{
  "songId": "song_123",
  "playDuration": 180000,  // 3 minutes in ms
  "songDuration": 210000,  // 3.5 minutes in ms
  "skipped": false,
  "source": "playlist",
  "deviceType": "mobile",
  "networkType": "wifi",
  "quality": "high",
  "liked": true,
  "sessionId": "session_456",
  "sessionPosition": 3
}
```

### Get Personalized Recommendations

```javascript
GET /api/v1/recommendations?limit=20

Response:
[
  {
    "songId": "song_789",
    "score": 0.87,
    "reason": "similar_features",
    "confidence": 0.85
  },
  {
    "songId": "song_012",
    "score": 0.82,
    "reason": "listening_history",
    "confidence": 0.78
  }
]
```

### Get User Stats

```javascript
GET /api/v1/analytics/stats?days=30

Response:
{
  "totalPlays": 456,
  "totalDuration": 82800000,  // ms
  "avgCompletionRate": 0.87,
  "skipRate": 0.13,
  "uniqueSongsCount": 123,
  "favoriteSource": "playlist"
}
```

## 🎯 Algorithm Details

### Hybrid Recommendation Algorithm

```
Final Score = 
  (Content-Based × 0.4) +
  (Collaborative × 0.3) +
  (Trending × 0.2) +
  (Time Context × 0.1)
```

### Content-Based Similarity

Uses Euclidean distance in feature space:
```
similarity = 1 - sqrt(
  (energy_diff)² +
  (valence_diff)² +
  (danceability_diff)² +
  (tempo_diff / 200)²
)
```

### Popularity Score

```
popularity = min(
  (plays / 10) × 0.3 +
  completion_rate × 30 +
  (1 - skip_rate) × 20 +
  min(likes / 10, 10) +
  min(unique_listeners / 5, 10),
  100
)
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific service
npm test -- analytics.service

# Test with coverage
npm test -- --coverage
```

## 🚀 Deployment

### MongoDB Atlas Setup

1. Create a free cluster at mongodb.com/atlas
2. Whitelist your IP / Allow access from anywhere
3. Create database user
4. Get connection string
5. Add to `.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/freeTune
   ```

### Initialize MongoDB

The models will auto-create collections on first use. Indexes are created automatically via schema definitions.

## 📊 Performance Considerations

### Indexes
- All critical fields are indexed
- Compound indexes for common queries
- TTL indexes for auto-cleanup

### Caching Strategy
- Recommendations cached for 24 hours
- Hot songs cached in Redis (1 hour)
- CDN URLs cached (30 minutes)

### Query Optimization
- Aggregation pipelines for complex queries
- Projection to limit returned fields
- Pagination for large datasets

## 🔮 Future Enhancements

1. **Deep Learning Models**
   - Neural collaborative filtering
   - Audio embedding using CNNs
   - Sequence models for session-based recommendations

2. **Advanced Features**
   - Real-time recommendations
   - Multi-armed bandit for exploration/exploitation
   - Reinforcement learning for personalization

3. **Analytics Dashboard**
   - Admin dashboard for insights
   - Real-time metrics
   - A/B testing framework

## 📝 Notes

- MongoDB TTL indexes handle automatic cleanup of old data
- Recommendation cache auto-expires after 24 hours
- Background jobs should be scheduled via Railway/Vercel cron
- All services are stateless and serverless-compatible

## 🤝 Contributing

When adding new features:
1. Update relevant models if schema changes needed
2. Add service methods in appropriate service file
3. Create controller methods
4. Add routes
5. Update this README
6. Add tests

---

**Built for FreeTune - Zero-cost, ML-powered music streaming** 🎵🚀
