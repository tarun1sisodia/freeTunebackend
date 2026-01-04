import { Redis } from "@upstash/redis";
import config from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let redisClient = null;

// Simple in-memory cache to reduce Redis hits
const localCache = new Map();

// Clear expired local cache items periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of localCache.entries()) {
    if (item.expiry < now) {
      localCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

const getRedisClient = () => {
  if (process.env.REDIS_DISABLED === "true") {
    // Only log once to avoid noise
    if (!redisClient) {
      logger.warn("REDIS_DISABLED is set to true. Caching is disabled.");
      // Mark as initialized to suppress further warnings (if we tracked it)
      // but here we just return null.
      redisClient = "disabled";
    }
    return null;
  }

  if (redisClient === "disabled") return null;

  if (!redisClient) {
    if (!config.redis.url || !config.redis.token) {
      logger.warn("Redis URL/Token not configured, caching disabled");
      return null;
    }

    try {
      redisClient = new Redis({
        url: config.redis.url,
        token: config.redis.token,
      });

      logger.info("Upstash Redis initialized");
    } catch (error) {
      logger.error("Redis initialization error:", error);
      return null;
    }
  }

  return redisClient;
};

const cacheGet = async key => {
  // 1. Try local memory cache first
  const now = Date.now();
  if (localCache.has(key)) {
    const item = localCache.get(key);
    if (item.expiry > now) {
      logger.debug(`Local Cache HIT: ${key}`);
      return item.value;
    } else {
      localCache.delete(key);
    }
  }

  // 2. Fallback to Redis
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get(key);

    // 3. Populate local cache if data found (short TTL for local cache)
    if (data) {
      // Default local TTL: 60 seconds (prevents repeated hits in short bursts)
      // We don't know the original Redis TTL here easily effectively, so we keep local cache short.
      localCache.set(key, { value: data, expiry: now + 60 * 1000 });
    }

    return data;
  } catch (error) {
    logger.error(`Cache GET error for key ${key}:`, error);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 3600) => {
  // 1. Set in Redis
  const client = getRedisClient();

  // Update local cache regardless of Redis status (if Redis is disabled, at least we have local cache for this process)
  // Local cache TTL should be capped to prevent memory bloat, but respecting the requested TTL if smaller.
  // Let's cap local cache TTL at 5 minutes for general safety, unless requested TTL is shorter.
  // Actually, for "user:id" we might want longer, but let's stick to a safe default for now.
  const now = Date.now();
  const localTtl = Math.min(ttl, 300); // Max 5 minutes local cache
  localCache.set(key, { value, expiry: now + localTtl * 1000 });

  if (!client) return false;

  try {
    await client.set(key, value, { ex: ttl });
    return true;
  } catch (error) {
    logger.error(`Cache SET error for key ${key}:`, error);
    return false;
  }
};

const cacheDel = async key => {
  localCache.delete(key);

  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache DEL error for key ${key}:`, error);
    return false;
  }
};

const cacheFlush = async () => {
  localCache.clear();

  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.flushdb();
    return true;
  } catch (error) {
    logger.error("Cache FLUSH error:", error);
    return false;
  }
};

export { getRedisClient, cacheGet, cacheSet, cacheDel, cacheFlush };
