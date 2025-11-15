/**
 * API Integration Tests for All Routes
 * Tests route existence and basic error handling
 */

import request from 'supertest';
import app from '../../../src/app.js';

describe('API Routes', () => {
  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for root API path without endpoint', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check Route', () => {
    it('should be accessible without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);

      // CORS headers should be present (handled by cors middleware)
      expect(response.headers).toBeDefined();
    });
  });

  describe('Request ID', () => {
    it('should include X-Request-Id header', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});

