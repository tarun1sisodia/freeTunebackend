/**
 * Unit Tests for ApiError utility
 */

import ApiError from '../../../src/utils/apiError.js';
import { HTTP_STATUS } from '../../../src/utils/constants.js';

describe('ApiError', () => {
  describe('Constructor', () => {
    it('should create an ApiError with default values', () => {
      const error = new ApiError(400);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Something went wrong');
      expect(error.errors).toEqual([]);
      expect(error.success).toBe(false);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
      expect(error.stack).toBeDefined();
    });

    it('should create an ApiError with custom values', () => {
      const customErrors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ApiError(400, 'Custom error', customErrors);
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Custom error');
      expect(error.errors).toEqual(customErrors);
    });

    it('should handle programming errors (non-operational)', () => {
      const error = new ApiError(500, 'Internal error', [], '', false);
      
      expect(error.isOperational).toBe(false);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create badRequest error', () => {
      const error = ApiError.badRequest('Invalid input');
      
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toBe('Invalid input');
    });

    it('should create unauthorized error', () => {
      const error = ApiError.unauthorized('Not authenticated');
      
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.message).toBe('Not authenticated');
    });

    it('should create forbidden error', () => {
      const error = ApiError.forbidden('Access denied');
      
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(error.message).toBe('Access denied');
    });

    it('should create notFound error', () => {
      const error = ApiError.notFound('Resource not found');
      
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(error.message).toBe('Resource not found');
    });

    it('should create conflict error', () => {
      const error = ApiError.conflict('Resource already exists');
      
      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(error.message).toBe('Resource already exists');
    });

    it('should create tooManyRequests error', () => {
      const error = ApiError.tooManyRequests('Rate limit exceeded');
      
      expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should create internal error', () => {
      const error = ApiError.internal('Server error');
      
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('Server error');
      expect(error.isOperational).toBe(false);
    });

    it('should create validation error with errors array', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' }
      ];
      const error = ApiError.validation(errors);
      
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
    });
  });

  describe('Error Properties', () => {
    it('should have correct error structure', () => {
      const error = ApiError.badRequest('Test error');
      
      expect(error).toHaveProperty('name', 'ApiError');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('success', false);
      expect(error).toHaveProperty('errors');
      expect(error).toHaveProperty('timestamp');
      expect(error).toHaveProperty('isOperational');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw ApiError.badRequest('Test');
      }).toThrow(ApiError);
      
      try {
        throw ApiError.badRequest('Test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Test');
      }
    });
  });
});

