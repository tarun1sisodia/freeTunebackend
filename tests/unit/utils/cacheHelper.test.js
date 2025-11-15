/**
 * Unit Tests for CacheHelper utility
 */

import cacheHelper, { CacheHelper } from '../../../src/utils/cacheHelper.js';
import { CACHE_TTL, CACHE_KEYS } from '../../../src/utils/constants.js';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incrby: jest.fn(),
  decrby: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  flushdb: jest.fn(),
  ping: jest.fn(),
};

jest.mock('../../../src/database/connections/redis.js', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
}));

describe('CacheHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClient', () => {
    it('should return Redis client when available', () => {
      const client = cacheHelper.getClient();
      expect(client).toBe(mockRedisClient);
    });

    it('should disable cache when client is not available', () => {
      const { getRedisClient } = require('../../../src/database/connections/redis.js');
      getRedisClient.mockReturnValueOnce(null);
      
      const helper = new CacheHelper();
      const client = helper.getClient();
      
      expect(client).toBeNull();
      expect(helper.isEnabled()).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return true when cache is enabled', () => {
      expect(cacheHelper.isEnabled()).toBe(true);
    });
  });

  describe('get', () => {
    it('should return cached value when key exists', async () => {
      const key = 'test:key';
      const value = { id: 1, name: 'Test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));
      
      const result = await cacheHelper.get(key);
      
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(JSON.stringify(value));
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await cacheHelper.get('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should return null when cache is disabled', async () => {
      const helper = new CacheHelper();
      helper.enabled = false;
      
      const result = await helper.get('test:key');
      
      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await cacheHelper.get('test:key');
      
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with TTL', async () => {
      const key = 'test:key';
      const value = { id: 1 };
      const ttl = 3600;
      
      mockRedisClient.set.mockResolvedValue('OK');
      
      const result = await cacheHelper.set(key, value, ttl);
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, { ex: ttl });
      expect(result).toBe(true);
    });

    it('should use default TTL when not provided', async () => {
      const key = 'test:key';
      const value = { id: 1 };
      
      mockRedisClient.set.mockResolvedValue('OK');
      
      await cacheHelper.set(key, value);
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, { ex: CACHE_TTL.HOT_SONGS });
    });

    it('should return false when cache is disabled', async () => {
      const helper = new CacheHelper();
      helper.enabled = false;
      
      const result = await helper.set('test:key', 'value');
      
      expect(result).toBe(false);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));
      
      const result = await cacheHelper.set('test:key', 'value');
      
      expect(result).toBe(false);
    });
  });

  describe('del', () => {
    it('should delete key from cache', async () => {
      const key = 'test:key';
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await cacheHelper.del(key);
      
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false when cache is disabled', async () => {
      const helper = new CacheHelper();
      helper.enabled = false;
      
      const result = await helper.del('test:key');
      
      expect(result).toBe(false);
    });
  });

  describe('delMany', () => {
    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await cacheHelper.delMany(keys);
      
      expect(mockRedisClient.del).toHaveBeenCalledTimes(3);
      expect(result).toBe(true);
    });

    it('should return false for empty array', async () => {
      const result = await cacheHelper.delMany([]);
      
      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      
      const result = await cacheHelper.exists('test:key');
      
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      
      const result = await cacheHelper.exists('test:key');
      
      expect(result).toBe(false);
    });
  });

  describe('incr', () => {
    it('should increment counter by default amount', async () => {
      mockRedisClient.incrby.mockResolvedValue(2);
      
      const result = await cacheHelper.incr('counter:key');
      
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter:key', 1);
      expect(result).toBe(2);
    });

    it('should increment counter by custom amount', async () => {
      mockRedisClient.incrby.mockResolvedValue(5);
      
      const result = await cacheHelper.incr('counter:key', 3);
      
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter:key', 3);
      expect(result).toBe(5);
    });
  });

  describe('decr', () => {
    it('should decrement counter by default amount', async () => {
      mockRedisClient.decrby.mockResolvedValue(1);
      
      const result = await cacheHelper.decr('counter:key');
      
      expect(mockRedisClient.decrby).toHaveBeenCalledWith('counter:key', 1);
      expect(result).toBe(1);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when available', async () => {
      const key = 'test:key';
      const cachedValue = { id: 1 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));
      
      const fn = jest.fn();
      
      const result = await cacheHelper.getOrSet(key, fn);
      
      expect(result).toEqual(JSON.stringify(cachedValue));
      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result on cache miss', async () => {
      const key = 'test:key';
      const freshValue = { id: 2 };
      
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      
      const fn = jest.fn().mockResolvedValue(freshValue);
      
      const result = await cacheHelper.getOrSet(key, fn);
      
      expect(fn).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, freshValue, { ex: CACHE_TTL.HOT_SONGS });
      expect(result).toEqual(freshValue);
    });

    it('should handle function errors gracefully', async () => {
      const key = 'test:key';
      mockRedisClient.get.mockResolvedValue(null);
      
      const fn = jest.fn().mockRejectedValue(new Error('Function error'));
      
      await expect(cacheHelper.getOrSet(key, fn)).rejects.toThrow('Function error');
    });
  });
});

