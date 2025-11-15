/**
 * Unit Tests for Authentication Middleware
 */

import { authMiddleware, optionalAuth } from '../../../src/middleware/auth.js';
import ApiError from '../../../src/utils/apiError.js';
import { HTTP_STATUS } from '../../../src/utils/constants.js';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock('../../../src/database/connections/supabase.js', () => ({
  getSupabaseClient: jest.fn(() => mockSupabaseClient),
}));

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.mockRequest();
    res = global.mockResponse();
    next = global.mockNext();
    jest.clearAllMocks();
  });

  it('should throw error when no authorization header', async () => {
    req.headers = {};
    
    await expect(authMiddleware(req, res, next)).rejects.toThrow(ApiError);
    
    try {
      await authMiddleware(req, res, next);
    } catch (error) {
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.message).toContain('No token provided');
    }
  });

  it('should throw error when authorization header does not start with Bearer', async () => {
    req.headers.authorization = 'Invalid token';
    
    await expect(authMiddleware(req, res, next)).rejects.toThrow(ApiError);
    
    try {
      await authMiddleware(req, res, next);
    } catch (error) {
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
    }
  });

  it('should throw error when Supabase client is not available', async () => {
    const { getSupabaseClient } = require('../../../src/database/connections/supabase.js');
    getSupabaseClient.mockReturnValueOnce(null);
    
    req.headers.authorization = 'Bearer valid-token';
    
    await expect(authMiddleware(req, res, next)).rejects.toThrow(ApiError);
    
    try {
      await authMiddleware(req, res, next);
    } catch (error) {
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.message).toContain('Authentication service unavailable');
    }
  });

  it('should throw error when token is invalid', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    
    await expect(authMiddleware(req, res, next)).rejects.toThrow(ApiError);
    
    try {
      await authMiddleware(req, res, next);
    } catch (error) {
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.message).toContain('Invalid or expired token');
    }
  });

  it('should attach user to request when token is valid', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        username: 'testuser',
        full_name: 'Test User',
      },
    };
    
    req.headers.authorization = 'Bearer valid-token';
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    
    await authMiddleware(req, res, next);
    
    expect(req.user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      username: mockUser.user_metadata.username,
      full_name: mockUser.user_metadata.full_name,
    });
    expect(next).toHaveBeenCalled();
  });

  it('should extract token correctly from Bearer header', async () => {
    const token = 'test-token-123';
    req.headers.authorization = `Bearer ${token}`;
    
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {},
    };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    
    await authMiddleware(req, res, next);
    
    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(token);
  });
});

describe('optionalAuth', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.mockRequest();
    res = global.mockResponse();
    next = global.mockNext();
    jest.clearAllMocks();
  });

  it('should continue without user when no authorization header', async () => {
    req.headers = {};
    
    await optionalAuth(req, res, next);
    
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should attach user when valid token is provided', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { username: 'testuser' },
    };
    
    req.headers.authorization = 'Bearer valid-token';
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    
    await optionalAuth(req, res, next);
    
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(mockUser.id);
    expect(next).toHaveBeenCalled();
  });

  it('should continue without user when token is invalid', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    
    await optionalAuth(req, res, next);
    
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should continue without user when Supabase client is not available', async () => {
    const { getSupabaseClient } = require('../../../src/database/connections/supabase.js');
    getSupabaseClient.mockReturnValueOnce(null);
    
    req.headers.authorization = 'Bearer token';
    
    await optionalAuth(req, res, next);
    
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

