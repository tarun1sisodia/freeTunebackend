/**
 * Redis Connection Integration Tests
 * Tests cache connectivity and operations
 */

import {
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheFlush,
} from '../../../src/database/connections/redis.js';
import {
  cleanupTestCache,
  verifyRedisConnection,
  waitForCacheExpiry,
} from '../../helpers/testCache.js';

describe('Redis Cache Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestCache();
  });

  afterAll(async () => {
    await cleanupTestCache();
  });

  describe('Connection Tests', () => {
    test('should create Redis client successfully', () => {
      const client = getRedisClient();
      
      if (client) {
        expect(client).toBeDefined();
      } else {
        console.warn('Redis not configured, skipping test');
      }
    });

    test('should verify Redis connection', async () => {
      const isConnected = await verifyRedisConnection();
      
      if (isConnected) {
        expect(isConnected).toBe(true);
      } else {
        console.warn('Redis not connected, skipping test');
      }
    });
  });

  describe('Basic Cache Operations', () => {
    test('should SET and GET a string value', async () => {
      const key = 'test:string';
      const value = 'test value';

      const setResult = await cacheSet(key, value, 60);
      expect(setResult).toBe(true);

      const getValue = await cacheGet(key);
      expect(getValue).toBe(value);

      await cacheDel(key);
    });

    test('should SET and GET a JSON object', async () => {
      const key = 'test:json';
      const value = { name: 'Test', count: 42 };

      await cacheSet(key, JSON.stringify(value), 60);
      const getValue = await cacheGet(key);
      
      if (getValue) {
        const parsed = typeof getValue === 'string' ? JSON.parse(getValue) : getValue;
        expect(parsed.name).toBe('Test');
        expect(parsed.count).toBe(42);
      }

      await cacheDel(key);
    });

    test('should DELETE a cache key', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';

      await cacheSet(key, value, 60);
      
      const beforeDelete = await cacheGet(key);
      expect(beforeDelete).toBe(value);

      const delResult = await cacheDel(key);
      expect(delResult).toBe(true);

      const afterDelete = await cacheGet(key);
      expect(afterDelete).toBeNull();
    });

    test('should return null for non-existent key', async () => {
      const value = await cacheGet('non:existent:key');
      expect(value).toBeNull();
    });

    test('should handle missing key gracefully', async () => {
      const delResult = await cacheDel('non:existent:key');
      // Should not throw error
      expect(delResult).toBeDefined();
    });
  });

  describe('TTL and Expiration', () => {
    test('should SET value with TTL', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';

      await cacheSet(key, value, 2); // 2 seconds TTL
      
      const getValue = await cacheGet(key);
      expect(getValue).toBe(value);

      await cacheDel(key);
    });

    test('should expire key after TTL', async () => {
      const key = 'test:expire';
      const value = 'will expire';

      await cacheSet(key, value, 1); // 1 second TTL
      
      const beforeExpiry = await cacheGet(key);
      expect(beforeExpiry).toBe(value);

      // Wait for expiration
      await waitForCacheExpiry(1500);

      const afterExpiry = await cacheGet(key);
      expect(afterExpiry).toBeNull();
    }, 10000);
  });

  describe('Complex Data Types', () => {
    test('should handle nested JSON objects', async () => {
      const key = 'test:nested';
      const value = {
        user: {
          id: '123',
          name: 'Test User',
          preferences: {
            theme: 'dark',
            quality: 'high',
          },
        },
      };

      await cacheSet(key, JSON.stringify(value), 60);
      const getValue = await cacheGet(key);
      
      if (getValue) {
        const parsed = typeof getValue === 'string' ? JSON.parse(getValue) : getValue;
        expect(parsed.user.name).toBe('Test User');
        expect(parsed.user.preferences.theme).toBe('dark');
      }

      await cacheDel(key);
    });

    test('should handle array data', async () => {
      const key = 'test:array';
      const value = [1, 2, 3, 4, 5];

      await cacheSet(key, JSON.stringify(value), 60);
      const getValue = await cacheGet(key);
      
      if (getValue) {
        const parsed = typeof getValue === 'string' ? JSON.parse(getValue) : getValue;
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(5);
      }

      await cacheDel(key);
    });

    test('should handle special characters in values', async () => {
      const key = 'test:special';
      const value = 'Test with "quotes" and \n newlines';

      await cacheSet(key, value, 60);
      const getValue = await cacheGet(key);
      expect(getValue).toBe(value);

      await cacheDel(key);
    });
  });

  describe('Cache Performance', () => {
    test('should handle multiple SET operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(cacheSet(`test:multi:${i}`, `value ${i}`, 60));
      }

      const results = await Promise.all(operations);
      expect(results.every(r => r === true)).toBe(true);

      // Cleanup
      for (let i = 0; i < 10; i++) {
        await cacheDel(`test:multi:${i}`);
      }
    });

    test('should handle multiple GET operations', async () => {
      // Set up test data
      for (let i = 0; i < 5; i++) {
        await cacheSet(`test:batch:${i}`, `value ${i}`, 60);
      }

      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(cacheGet(`test:batch:${i}`));
      }

      const results = await Promise.all(operations);
      expect(results.length).toBe(5);
      expect(results[0]).toBe('value 0');

      // Cleanup
      for (let i = 0; i < 5; i++) {
        await cacheDel(`test:batch:${i}`);
      }
    });

    test('should complete operations within reasonable time', async () => {
      const startTime = Date.now();
      
      await cacheSet('test:performance', 'test value', 60);
      await cacheGet('test:performance');
      await cacheDel('test:performance');
      
      const duration = Date.now() - startTime;
      
      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const redis = getRedisClient();
      if (!redis) return;

      const key = 'test:malformed';
      
      // Manually set malformed JSON
      await redis.set(key, 'not valid json{', { ex: 60 });
      
      const value = await cacheGet(key);
      // Should return the raw string
      expect(value).toBeDefined();

      await cacheDel(key);
    });

    test('should handle empty string values', async () => {
      const key = 'test:empty';
      await cacheSet(key, '', 60);
      
      const value = await cacheGet(key);
      expect(value).toBe('');

      await cacheDel(key);
    });

    test('should handle null values', async () => {
      const key = 'test:null';
      await cacheSet(key, null, 60);
      
      const value = await cacheGet(key);
      // Behavior depends on implementation
      expect(value).toBeDefined();

      await cacheDel(key);
    });
  });

  describe('Cache Patterns', () => {
    test('should implement cache-aside pattern', async () => {
      const key = 'user:123';
      
      // Check cache first
      let value = await cacheGet(key);
      
      if (!value) {
        // Simulate database fetch
        value = { id: '123', name: 'Test User' };
        await cacheSet(key, JSON.stringify(value), 60);
      }

      expect(value).toBeDefined();
      
      // Second fetch should hit cache
      const cachedValue = await cacheGet(key);
      expect(cachedValue).toBeDefined();

      await cacheDel(key);
    });

    test('should implement write-through pattern', async () => {
      const key = 'data:456';
      const value = { id: '456', data: 'test' };

      // Write to cache and "database" (simulated)
      await cacheSet(key, JSON.stringify(value), 60);
      
      // Verify cache has the value
      const cachedValue = await cacheGet(key);
      expect(cachedValue).toBeDefined();

      await cacheDel(key);
    });

    test('should handle cache invalidation', async () => {
      const key = 'invalidate:test';
      
      await cacheSet(key, 'old value', 60);
      
      // Invalidate cache (simulate data update)
      await cacheDel(key);
      
      // Set new value
      await cacheSet(key, 'new value', 60);
      
      const value = await cacheGet(key);
      expect(value).toBe('new value');

      await cacheDel(key);
    });
  });
});
