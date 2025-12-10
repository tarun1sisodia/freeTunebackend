/**
 * API Integration Tests for Playlists
 */

import request from 'supertest';
import app from '../../../src/app.js';

describe('Playlists API', () => {
  describe('GET /api/v1/playlists', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/playlists')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/playlists', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/playlists')
        .send({
          name: 'My Playlist',
          description: 'Test playlist',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/playlists/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/playlists/123')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/playlists/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/playlists/123')
        .send({
          name: 'Updated Playlist',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/playlists/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/playlists/123')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/playlists/:id/songs', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/playlists/123/songs')
        .send({
          songId: '456',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/playlists/:id/songs/:songId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/playlists/123/songs/456')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
