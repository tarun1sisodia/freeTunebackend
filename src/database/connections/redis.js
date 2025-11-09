import Redis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    if (!config.redis.url) {
      logger.warn('Redis URL not configured, caching disabled');
      return null;
    }

    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', err => {
      logger.error('Redis connection error:', err);
    });
  }

  return redisClient;
};

const cacheGet = async key => {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Cache GET error for key ${key}:`, error);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 3600) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Cache SET error for key ${key}:`, error);
    return false;
  }
};

const cacheDel = async key => {
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
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.flushall();
    return true;
  } catch (error) {
    logger.error('Cache FLUSH error:', error);
    return false;
  }
};

export { getRedisClient, cacheGet, cacheSet, cacheDel, cacheFlush };
