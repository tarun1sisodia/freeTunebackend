/**
 * Unit Tests for Validator Middleware
 */

import { validate } from '../../../src/middleware/validator.js';
import { z } from 'zod';
import ApiError from '../../../src/utils/apiError.js';
import { HTTP_STATUS } from '../../../src/utils/constants.js';

describe('validate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.mockRequest();
    res = global.mockResponse();
    next = global.mockNext();
    jest.clearAllMocks();
  });

  it('should pass validation for valid data', () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
        name: z.string(),
      }),
    });

    req.body = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.email).toBe('test@example.com');
  });

  it('should fail validation for invalid data', () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
        name: z.string(),
      }),
    });

    req.body = {
      email: 'invalid-email',
      name: 'Test User',
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(error.message).toBe('Validation failed');
    expect(error.errors).toBeInstanceOf(Array);
    expect(error.errors.length).toBeGreaterThan(0);
  });

  it('should validate query parameters', () => {
    const schema = z.object({
      query: z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number),
      }),
    });

    req.query = {
      page: '1',
      limit: '20',
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query.page).toBe(1);
    expect(req.query.limit).toBe(20);
  });

  it('should validate route parameters', () => {
    const schema = z.object({
      params: z.object({
        id: z.string().uuid(),
      }),
    });

    req.params = {
      id: '123e4567-e89b-12d3-a456-426614174000',
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should validate multiple request parts', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      query: z.object({
        page: z.string(),
      }),
      params: z.object({
        id: z.string(),
      }),
    });

    req.body = { name: 'Test' };
    req.query = { page: '1' };
    req.params = { id: '123' };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should format validation errors correctly', () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
    });

    req.body = {
      email: 'invalid',
      password: 'short',
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error.errors).toBeInstanceOf(Array);
    error.errors.forEach(err => {
      expect(err).toHaveProperty('field');
      expect(err).toHaveProperty('message');
    });
  });

  it('should handle nested validation errors', () => {
    const schema = z.object({
      body: z.object({
        user: z.object({
          email: z.string().email(),
        }),
      }),
    });

    req.body = {
      user: {
        email: 'invalid-email',
      },
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error.errors).toBeInstanceOf(Array);
    expect(error.errors.some(e => e.field.includes('user'))).toBe(true);
  });

  it('should handle non-Zod errors', () => {
    const schema = {
      safeParse: () => {
        throw new Error('Unexpected error');
      },
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

