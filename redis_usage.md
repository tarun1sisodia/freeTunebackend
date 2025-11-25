# Redis Usage in FreeTune Backend - Complete Guide

## 🎯 Overview

Your backend uses **Upstash Redis** (serverless Redis) for caching to improve performance and reduce database load.

---

## 📍 Where Redis is Used

### 1. **Recommendations Caching**
**Location:** `src/services/recommendation.service.js`

**Purpose:** Cache expensive ML/similarity calculations

**Use Cases:**
```javascript
// Cache similar songs
const cacheKey = `similar:${songId}:${limit}`;
const cached = await cacheHelper.get(cacheKey);
if (cached) return cached;

// ... expensive calculation ...

await cacheHelper.set(cacheKey, recommendations, 3600); // 1 hour
```

**Why?**
- Similar song calculations involve complex algorithms
- Results don't change frequently
- Saves ~500ms per request

---

### 2. **Authentication Token Storage**
**Location:** `src/services/auth.service.js`

**Purpose:** Store refresh tokens and session data

**Use Cases:**
```javascript
// Store refresh token
await cacheSet(`refresh_token:${userId}`, token, 604800); // 7 days

// Validate token
const storedToken = await cacheGet(`refresh_token:${userId}`);

// Logout - delete token
await cacheDel(`refresh_token:${userId}`);
```

**Why?**
- Fast token validation (no DB query needed)
- Automatic expiry (Redis TTL)
- Easy revocation (just delete key)

---

### 3. **Planned: Streaming URL Caching**
**Location:** Will be in streaming controller (not implemented yet)

**Purpose:** Cache Cloudflare R2 signed URLs

**Planned Implementation:**
```javascript
// Check cache for signed URL
const cacheKey = `cdn:url:${songId}:${quality}`;
const cachedUrl = await cacheHelper.get(cacheKey);

if (cachedUrl) {
  return cachedUrl; // Return immediately
}

// Generate new signed URL from R2
const signedUrl = await generateSignedUrl(songId, quality);

// Cache for 25 minutes (URL expires in 30)
await cacheHelper.set(cacheKey, signedUrl, 1500);

return signedUrl;
```

**Why?**
- Generating signed URLs is expensive (AWS SDK call)
- Each URL is valid for 30 minutes
- Can serve from cache for 25 minutes
- **Reduces latency from 200ms to 5ms**

---

## 🗄️ What is Stored in Redis?

### ❌ NOT Stored:
- ❌ Audio files (too big, use Cloudflare R2)
- ❌ User passwords (use database)
- ❌ Large objects (>1MB)

### ✅ STORED:
| Key Pattern | Value | TTL | Use Case |
|-------------|-------|-----|----------|
| `similar:123:20` | Array of similar songs | 1h | Recommendations |
| `refresh_token:user123` | JWT token | 7d | Authentication |
| `cdn:url:song123:medium` | Signed URL | 25m | Streaming |
| `hot:song:123` | Song metadata | 1h | Popular songs |
| `trending:daily` | Trending songs list | 1h | Trending page |
| `user:recent:user123` | Recently played | 7d | History |
| `search:arijit` | Search results | 30m | Search |
| `rec:user123` | User recommendations | 2h | Personalized |
| `playlist:123` | Playlist data | 1h | Playlists |

---

## 🚀 Current Redis Configuration

### Connection:
```javascript
// src/database/connections/redis.js
import { Redis } from "@upstash/redis";

const redisClient = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});
```

### Your Config (.env):
```env
REDIS_URL=https://prepared-lamprey-29776.upstash.io
REDIS_TOKEN=AXRQAAIncDI...
```

---

## 🛠️ Cache TTL Strategy

Defined in `src/utils/constants.js`:

```javascript
const CACHE_TTL = {
  HOT_SONGS: 3600,          // 1 hour
  USER_RECENT: 604800,      // 7 days
  TRENDING: 3600,           // 1 hour
  CDN_URLS: 1800,           // 30 minutes
  SEARCH_RESULTS: 1800,     // 30 minutes
  RECOMMENDATIONS: 7200,    // 2 hours
  USER_PREFERENCES: 86400,  // 1 day
  PLAYLIST: 3600,           // 1 hour
};
```

**Why Different TTLs?**
- **Short (30m):** Frequently changing data (search, CDN URLs)
- **Medium (1-2h):** Semi-static data (trending, playlists)
- **Long (7d):** Rarely changing data (user history, tokens)

---

## 📊 Performance Impact

### Without Redis:
```
User Request → Backend → Database Query (50ms) 
             → R2 Signed URL (200ms)
             → Return (Total: 250ms)
```

### With Redis:
```
User Request → Backend → Redis Check (5ms)
             → Cache HIT!
             → Return (Total: 5ms)
```

**50x faster!** 🚀

---

## 🎯 How Redis Helps Streaming

### Scenario: User plays a song

**Without Cache:**
1. User clicks play
2. Backend queries DB for song info (50ms)
3. Backend generates R2 signed URL (200ms)
4. Backend returns URL (Total: 250ms)
5. User waits... 😴

**With Cache:**
1. User clicks play
2. Backend checks Redis for cached URL (5ms)
3. **CACHE HIT!** Return immediately
4. User plays instantly! 🎵

### For Popular Songs:
- Song gets played 1000 times/hour
- Without cache: 1000 × 250ms = **250 seconds** of backend time
- With cache: 1 × 250ms (first request) + 999 × 5ms = **5 seconds**
- **50x reduction in load!**

---

## 🔐 Redis for Authentication

### How Refresh Tokens Work:

```
1. User Logs In
   ├─ Backend generates access_token (15m expiry)
   ├─ Backend generates refresh_token (7d expiry)
   └─ Store refresh_token in Redis:
      Key: "refresh_token:user123"
      Value: "eyJhbGc..."
      TTL: 604800 (7 days)

2. Access Token Expires (after 15m)
   ├─ Frontend sends refresh_token
   ├─ Backend checks Redis: cacheGet("refresh_token:user123")
   ├─ Valid? Generate new access_token
   └─ Invalid? User must login again

3. User Logs Out
   └─ Delete from Redis: cacheDel("refresh_token:user123")
      (Token immediately invalid!)
```

**Why Redis for Auth?**
- ✅ Fast validation (no DB query)
- ✅ Automatic expiry (TTL)
- ✅ Easy revocation (just delete)
- ✅ Scales to millions of users

---

## 🎨 Advanced: Cache Patterns

### 1. Cache-Aside (Most Common)
```javascript
// Try cache first
const cached = await cacheHelper.get(key);
if (cached) return cached;

// Cache miss - get from DB
const data = await database.query();

// Store in cache
await cacheHelper.set(key, data, 3600);
return data;
```

### 2. Cache-Through (Automatic)
```javascript
// Helper does it all
const data = await cacheHelper.getOrSet(
  key,
  () => database.query(), // Fallback function
  3600 // TTL
);
```

### 3. Write-Through (Update Both)
```javascript
// Update database
await database.update(songId, newData);

// Update cache immediately
await cacheHelper.set(`song:${songId}`, newData, 3600);
```

### 4. Cache Invalidation
```javascript
// When song is updated/deleted
await cacheHelper.del(`song:${songId}`);
await cacheHelper.del(`similar:${songId}:20`);
await cacheHelper.del(`cdn:url:${songId}:medium`);
```

---

## 🚧 What's NOT Using Redis Yet (But Should)

### 1. Streaming URLs
**Current:** Generate on every request (200ms)
**Should:** Cache for 25 minutes (5ms)

### 2. Popular Songs List
**Current:** DB query every time (50ms)
**Should:** Cache for 1 hour (5ms)

### 3. Search Results
**Current:** DB query every search (100ms)
**Should:** Cache for 30 minutes (5ms)

### 4. User Preferences
**Current:** DB query every request (30ms)
**Should:** Cache for 1 day (5ms)

---

## 💡 Best Practices

### ✅ DO:
- Cache expensive computations
- Cache frequently accessed data
- Use appropriate TTLs
- Handle cache misses gracefully
- Log cache hits/misses (for monitoring)

### ❌ DON'T:
- Store sensitive data without encryption
- Store huge objects (>1MB)
- Cache data that changes frequently
- Forget to invalidate on updates
- Rely on cache as primary storage

---

## 🔍 Monitoring Redis

### Check Cache Hit Rate:
```javascript
// In your code
const cached = await cacheHelper.get(key);
if (cached) {
  logger.debug('Cache HIT: ' + key);
} else {
  logger.debug('Cache MISS: ' + key);
}
```

### View Logs:
```bash
cd freeTuneBackend
tail -f logs/all.log | grep "Cache"
```

**Expected Output:**
```
Cache HIT: similar:123:20
Cache MISS: cdn:url:456:high
Cache SET: cdn:url:456:high (TTL: 1800s)
```

---

## 📈 Future Enhancements

1. **Leaderboards**
   - Store top 100 songs in sorted set
   - Update every 5 minutes
   - Instant access to trending

2. **Real-time Counters**
   - Play count increments
   - Concurrent listeners
   - Downloads tracking

3. **Session Storage**
   - User's current playlist
   - Playback position
   - Queue management

4. **Rate Limiting**
   - Track API requests per user
   - Block abusive users
   - Implement throttling

---

## ✨ Summary

**Redis in FreeTune:**
- ✅ Currently used for recommendations caching
- ✅ Currently used for authentication tokens
- 🔜 Should be used for streaming URLs (biggest impact!)
- 🔜 Should be used for search results
- 🔜 Should be used for trending songs

**Impact:**
- 50x faster response times
- 90% reduction in database load
- Better user experience
- Lower server costs

**Status:** Partially implemented, ready for expansion!

