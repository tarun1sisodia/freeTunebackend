/**
 * Integration Tests for Health Check Controller
 */

import request from 'supertest';
import app from '../../../src/app.js';

describe('Health Check Controller', () => {
  describe('GET /api/v1/healthcheck', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'OK');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(typeof response.body.data.uptime).toBe('number');
    });

    it('should have correct response structure', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        statusCode: 200,
        message: expect.any(String),
        data: {
          status: 'OK',
          uptime: expect.any(Number),
          timestamp: expect.any(String),
        },
        timestamp: expect.any(String),
      });
    });
  });
});

