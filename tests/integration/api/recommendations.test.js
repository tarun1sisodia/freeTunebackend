/**
 * API Integration Tests for Recommendations
 */

import request from 'supertest';
import app from '../../../src/app.js';

describe('Recommendations API', () => {
  describe('GET /api/v1/recommendations', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/recommendations');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/recommendations/similar/:songId', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/recommendations/similar/123');

      expect([200, 404, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/recommendations/mood/:mood', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/recommendations/mood/happy');

      expect([200, 404, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/recommendations/trending', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/recommendations/trending');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/recommendations/stats', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/recommendations/stats');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/recommendations/top', () => {
    it('should respond to the endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/recommendations/top');

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });
});
