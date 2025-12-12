/**
 * Cache Test Helpers
 * Utilities for testing Redis cache operations
 */

import { getRedisClient, cacheFlush } from '../../src/database/connections/redis.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Clean up all test cache data
 */
export const cleanupTestCache = async () => {
  try {
    await cacheFlush();
    logger.debug('Test cache cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup test cache:', error);
  }
};

/**
 * Set test cache value with TTL
 */
export const setTestCache = async (key, value, ttl = 60) => {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis not available');
  }

  await redis.set(key, JSON.stringify(value), { ex: ttl });
};

/**
 * Get test cache value
 */
export const getTestCache = async (key) => {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis not available');
  }

  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
};

/**
 * Delete test cache key
 */
export const deleteTestCache = async (key) => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  await redis.del(key);
};

/**
 * Verify Redis connection
 */
export const verifyRedisConnection = async () => {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.set('test:ping', 'pong', { ex: 10 });
    const result = await redis.get('test:ping');
    await redis.del('test:ping');
    return result === 'pong';
  } catch (error) {
    return false;
  }
};

/**
 * Get cache keys matching pattern
 */
export const getCacheKeys = async (pattern = '*') => {
  const redis = getRedisClient();
  if (!redis) {
    return [];
  }

  try {
    return await redis.keys(pattern);
  } catch (error) {
    logger.error('Failed to get cache keys:', error);
    return [];
  }
};

/**
 * Wait for cache to expire
 */
export const waitForCacheExpiry = (ms) => 
  new Promise(resolve => setTimeout(resolve, ms));
