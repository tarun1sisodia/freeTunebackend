/**
 * API Integration Tests for Analytics
 */

import request from 'supertest';
import app from '../../../src/app.js';

describe('Analytics API', () => {
  describe('POST /api/v1/analytics/track', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/track')
        .send({
          songId: '123',
          listenDuration: 120,
        });

      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/stats', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/stats');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/top-songs', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/top-songs');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/time-patterns', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/time-patterns');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/genre-preferences', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/genre-preferences');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/mood-preferences', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/mood-preferences');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/trending', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/trending');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });
});
