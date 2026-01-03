# 🎯 Redis Optimization Guide  
### Keep Redis usage under free-tier (≤ 500K commands/month)

Redis should be treated as a **HOT CACHE**, not a database.

This guide explains:

- ✅ **WHAT** changes to implement  
- 💡 **WHY** they are important  
- 📍 **WHERE** they should go in your codebase  

---

## 1️⃣ Add TTL to Every Redis Key

### 💡 Why
Keys without expiration live forever.  
They get read repeatedly → **thousands of unnecessary commands**.

### ✅ What to do
Always store cached values with a TTL.

```js
await redis.set(key, value, "EX", 3600);   // 1 hour
```

### 📍 Where
Backend service that writes Redis values:

- `/services/cache.service.js`
- `/queues/workers/…`
- `/controllers/search/…`

#### Suggested TTLs

| Key | TTL | Reason |
|-----|-----|--------|
| `song:map:{query}` | 1 hour | Search results refresh often |
| `cdn:urls:{song_id}` | 30–60 min | Signed URLs don’t change frequently |
| `lock:download:{query}` | 5 min | Prevent duplicate downloads |
| `trending:daily` | 1 hour | Trends don’t change constantly |
| `status:*` | 10 min | Processing states are temporary |

---

## 2️⃣ Add Local (In-Memory) Cache Before Redis

### 💡 Why
Most Redis calls are duplicates.  
If the server already fetched the value, reuse it.

### ✅ What to do

```js
const localCache = new Map();

async function getSongCache(key) {
  if (localCache.has(key)) return localCache.get(key);

  const value = await redis.get(key);
  if (value) localCache.set(key, value);
  return value;
}
```

### 📍 Where
API layer before calling Redis:

- `/services/cache.service.js`
- `/controllers/...`

---

## 3️⃣ Remove Polling — Use WebSockets

### 💡 Why
Polling loops like:

```
while(song.status !== ready)
```

can burn **thousands of commands per user**.

### ✅ What to do
Use **push notifications**:

- Worker → emits:
  - `song:processing`
  - `song:ready`
  - `song:error`

### 📍 Where
Backend:

- `/services/notification.service.js`
- workers (`/workers/...`)

Frontend: listen via WebSocket.

---

## 4️⃣ Replace Many GETs With `MGET`

### 💡 Why
Multiple Redis calls = multiple charges.

### ❌ Before
```js
redis.get(a)
redis.get(b)
redis.get(c)
```

### ✅ After
```js
await redis.mget(a, b, c);
```

### 📍 Where

Anywhere you fetch multiple keys.

---

## 5️⃣ Increase TTL for Signed URLs

### 💡 Why
Regenerating URLs too fast wastes commands.

### ✅ What to do
Cache for **30–60 minutes**:

```js
SET cdn:urls:{song_id} url EX 1800
```

### 📍 Where
Your streaming endpoint:

- `/api/songs/stream.js`

---

## 6️⃣ Move Non-Cache Data Out of Redis

### 💡 Why
Redis costs increase when misused as DB.

### ❌ Do NOT store in Redis:
- full listening history  
- analytics logs  
- recommendation history  

### ✅ Store instead:
| Data | Where |
|------|------|
| Listening history | MongoDB |
| Analytics | MongoDB |
| Search history | Supabase |

Redis stays for **HOT data only**:

✔ signed URLs  
✔ trending lists  
✔ locks  
✔ queue status  

---

## 7️⃣ Write-Through Cache Pattern

### 💡 Why
Keeps cache fresh, avoids extra reads.

### ✅ What to do

```js
await db.save(song);
await redis.set(`song:map:${song.id}`, song, "EX", 3600);
```

### 📍 Where
Wherever DB writes happen.

---

## 8️⃣ Use SETNX for Download Locks

### 💡 Why
Prevents duplicate workers → duplicate Redis calls.

### ✅ What to do

```js
await redis.setnx(`lock:download:${query}`, true);
redis.expire(`lock:download:${query}`, 300);
```

### 📍 Where
In yt-dlp download queue worker.

---

## 9️⃣ Add a Global Redis Fallback Switch

### 💡 Why
If free tier hits limit, app should not break.

### ✅ What to do

```js
if (process.env.REDIS_DISABLED === "true") return null;
```

Backend silently falls back to DB.

### 📍 Where
Inside every Redis wrapper function.

---

# 🔥 Result (What You Gain)

| Before | After |
|--------|------|
| 500k+ commands | **80k–150k/month** |
| Random limits | **Fully under free tier** |
| Wasted reads | **Smart caching** |
| Slow backend | **Faster responses** |

---

# 📌 Quick TL;DR (rules)

```
- Redis = HOT cache only
- Add TTL everywhere
- In-memory cache before Redis
- No polling — use WebSockets
- Use MGET, not multiple GETs
- Keep signed URLs 30–60 min
- Move analytics & history out of Redis
- Use SETNX to lock downloads
- Add REDIS_DISABLED fallback mode
```

---

## 🎯 Final note
If you want, I can also:

🔧 convert this guide into **actual code changes**  
🧪 simulate Redis usage reduction  
📊 add monitoring dashboards  
🚀 make auto-cleanup scripts

Just say:

> “Apply this to my backend code”

…and tell me whether your backend is **Node / Nest / Express / Supabase Edge / FastAPI**.

