/**
 * Redis Cache Helper Utility
 * Provides convenient methods for caching operations
 * Uses Upstash Redis REST API
 */

import { getRedisClient } from '../database/connections/redis.js';
import logger from './logger.js';
import { CACHE_TTL, CACHE_KEYS } from './constants.js';

class CacheHelper {
  constructor() {
    this.client = null;
    this.enabled = true;
  }

  /**
   * Initialize cache client
   */
  getClient() {
    if (!this.client) {
      this.client = getRedisClient();
      if (!this.client) {
        this.enabled = false;
        logger.warn('Cache disabled: Redis client not available');
      }
    }
    return this.client;
  }

  /**
   * Check if caching is enabled
   */
  isEnabled() {
    return this.enabled && this.getClient() !== null;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    if (!this.isEnabled()) return null;

    try {
      const client = this.getClient();
      const data = await client.get(key);
      
      if (data) {
        logger.debug(`Cache HIT: ${key}`);
        return data;
      }
      
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = CACHE_TTL.HOT_SONGS) {
    if (!this.isEnabled()) return false;

    try {
      const client = this.getClient();
      await client.set(key, value, { ex: ttl });
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.isEnabled()) return false;

    try {
      const client = this.getClient();
      await client.del(key);
      logger.debug(`Cache DEL: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<boolean>} Success status
   */
  async delMany(keys) {
    if (!this.isEnabled() || !keys.length) return false;

    try {
      const client = this.getClient();
      await Promise.all(keys.map(key => client.del(key)));
      logger.debug(`Cache DEL (${keys.length} keys)`);
      return true;
    } catch (error) {
      logger.error('Cache DEL multiple keys error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Key exists status
   */
  async exists(key) {
    if (!this.isEnabled()) return false;

    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment (default: 1)
   * @returns {Promise<number|null>} New value or null
   */
  async incr(key, amount = 1) {
    if (!this.isEnabled()) return null;

    try {
      const client = this.getClient();
      const result = await client.incrby(key, amount);
      return result;
    } catch (error) {
      logger.error(`Cache INCR error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Decrement counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to decrement (default: 1)
   * @returns {Promise<number|null>} New value or null
   */
  async decr(key, amount = 1) {
    if (!this.isEnabled()) return null;

    try {
      const client = this.getClient();
      const result = await client.decrby(key, amount);
      return result;
    } catch (error) {
      logger.error(`Cache DECR error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set expiry on existing key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async expire(key, ttl) {
    if (!this.isEnabled()) return false;

    try {
      const client = this.getClient();
      await client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL
   * @param {string} key - Cache key
   * @returns {Promise<number>} Remaining TTL in seconds (-1 if no expiry, -2 if not exists)
   */
  async ttl(key) {
    if (!this.isEnabled()) return -2;

    try {
      const client = this.getClient();
      return await client.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Get or set pattern - Get from cache or execute function and cache result
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to execute if cache miss
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or fresh value
   */
  async getOrSet(key, fn, ttl = CACHE_TTL.HOT_SONGS) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function to get fresh data
      const freshData = await fn();
      
      // Cache the result
      if (freshData !== null && freshData !== undefined) {
        await this.set(key, freshData, ttl);
      }

      return freshData;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      // On error, try to return fresh data without caching
      try {
        return await fn();
      } catch (fnError) {
        logger.error(`Function execution error in getOrSet:`, fnError);
        throw fnError;
      }
    }
  }

  /**
   * Invalidate cache by pattern (use with caution)
   * @param {string} pattern - Pattern to match keys (e.g., 'user:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidatePattern(pattern) {
    if (!this.isEnabled()) return 0;

    try {
      const client = this.getClient();
      // Note: Upstash Redis REST API might not support SCAN
      // This is a simplified version - implement based on your needs
      logger.warn(`Pattern invalidation requested: ${pattern} - implement based on Upstash capabilities`);
      return 0;
    } catch (error) {
      logger.error(`Cache pattern invalidation error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Flush entire cache (use with extreme caution!)
   * @returns {Promise<boolean>} Success status
   */
  async flush() {
    if (!this.isEnabled()) return false;

    try {
      const client = this.getClient();
      await client.flushdb();
      logger.warn('Cache FLUSHED - all keys deleted');
      return true;
    } catch (error) {
      logger.error('Cache FLUSH error:', error);
      return false;
    }
  }

  /**
   * Cache middleware for Express routes
   * @param {number} ttl - Time to live in seconds
   * @returns {Function} Express middleware
   */
  middleware(ttl = CACHE_TTL.HOT_SONGS) {
    return async (req, res, next) => {
      if (!this.isEnabled()) {
        return next();
      }

      // Generate cache key from request
      const key = `route:${req.method}:${req.originalUrl}`;

      try {
        const cached = await this.get(key);
        if (cached) {
          return res.json({
            ...cached,
            cached: true,
            cacheKey: key,
          });
        }

        // Store original send function
        const originalSend = res.json.bind(res);

        // Override send to cache response
        res.json = (body) => {
          if (res.statusCode === 200 && body.success) {
            this.set(key, body, ttl).catch(err => {
              logger.error('Cache middleware SET error:', err);
            });
          }
          return originalSend(body);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }
}

// Export singleton instance
const cacheHelper = new CacheHelper();
export default cacheHelper;

// Export class for testing
export { CacheHelper };
