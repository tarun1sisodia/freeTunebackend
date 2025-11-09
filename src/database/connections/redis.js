import { Redis } from '@upstash/redis';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    if (!config.redis.url || !config.redis.token) {
      logger.warn('Redis URL/Token not configured, caching disabled');
      return null;
    }

    try {
      redisClient = new Redis({
        url: config.redis.url,
        token: config.redis.token,
      });

      logger.info('Upstash Redis initialized');
    } catch (error) {
      logger.error('Redis initialization error:', error);
      return null;
    }
  }

  return redisClient;
};

const cacheGet = async key => {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    return data;
  } catch (error) {
    logger.error(`Cache GET error for key ${key}:`, error);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 3600) => {
  const client = getRedisClient();
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
    await client.flushdb();
    return true;
  } catch (error) {
    logger.error('Cache FLUSH error:', error);
    return false;
  }
};

export { getRedisClient, cacheGet, cacheSet, cacheDel, cacheFlush };
