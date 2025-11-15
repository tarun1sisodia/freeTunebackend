/**
 * API Integration Tests for Songs
 */

import request from 'supertest';
import app from '../../../src/app.js';

describe('Songs API', () => {
  describe('GET /api/v1/songs', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/songs')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/songs/search', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/songs/search')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/songs/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/songs/123')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/songs/upload', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/songs/upload')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/songs/:id/stream-url', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/songs/123/stream-url')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

