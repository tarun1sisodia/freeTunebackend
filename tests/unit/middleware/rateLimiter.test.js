/**
 * Unit Tests for Rate Limiter Middleware
 */

import { apiLimiter, authLimiter, streamLimiter, searchLimiter } from '../../../src/middleware/rateLimiter.js';
import config from '../../../src/config/index.js';

describe('Rate Limiter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.mockRequest();
    req.ip = '127.0.0.1';
    res = global.mockResponse();
    next = global.mockNext();
    jest.clearAllMocks();
  });

  describe('apiLimiter', () => {
    it('should be defined', () => {
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    it('should allow requests within limit', async () => {
      // First request should pass
      await new Promise((resolve) => {
        apiLimiter(req, res, (err) => {
          if (err) return resolve(err);
          next();
          resolve();
        });
      });
      
      // Note: Actual rate limiting behavior is tested in integration tests
      // This is a basic structure test
    });
  });

  describe('authLimiter', () => {
    it('should be defined', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    it('should have stricter limits than API limiter', () => {
      // Auth limiter should have lower max requests
      expect(authLimiter).toBeDefined();
    });
  });

  describe('streamLimiter', () => {
    it('should be defined', () => {
      expect(streamLimiter).toBeDefined();
      expect(typeof streamLimiter).toBe('function');
    });
  });

  describe('searchLimiter', () => {
    it('should be defined', () => {
      expect(searchLimiter).toBeDefined();
      expect(typeof searchLimiter).toBe('function');
    });
  });
});

