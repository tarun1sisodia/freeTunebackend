/**
 * Unit Tests for ApiResponse utility
 */

import {
  ApiResponse,
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  cachedResponse,
} from '../../../src/utils/apiResponse.js';
import ApiError from '../../../src/utils/apiError.js';
import { HTTP_STATUS } from '../../../src/utils/constants.js';

describe('ApiResponse', () => {
  describe('Constructor', () => {
    it('should create an ApiResponse with default values', () => {
      const response = new ApiResponse(200);
      
      expect(response.statusCode).toBe(200);
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.data).toBeNull();
      expect(response.timestamp).toBeDefined();
    });

    it('should create an ApiResponse with custom values', () => {
      const data = { id: 1, name: 'Test' };
      const response = new ApiResponse(201, data, 'Created');
      
      expect(response.statusCode).toBe(201);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Created');
    });

    it('should mark error responses as unsuccessful', () => {
      const response = new ApiResponse(400);
      
      expect(response.statusCode).toBe(400);
      expect(response.success).toBe(false);
    });
  });
});

describe('successResponse', () => {
  let res;

  beforeEach(() => {
    res = global.mockResponse();
  });

  it('should send success response with default values', () => {
    const data = { id: 1 };
    
    successResponse(res, data);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        statusCode: 200,
        data,
        message: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });

  it('should send success response with custom message and status code', () => {
    const data = { id: 1 };
    const message = 'Operation successful';
    const statusCode = 201;
    
    successResponse(res, data, message, statusCode);
    
    expect(res.status).toHaveBeenCalledWith(statusCode);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        statusCode,
        data,
        message,
      })
    );
  });
});

describe('errorResponse', () => {
  let res;

  beforeEach(() => {
    res = global.mockResponse();
  });

  it('should send error response with default values', () => {
    errorResponse(res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: expect.any(String),
      })
    );
  });

  it('should send error response with custom values', () => {
    const message = 'Custom error';
    const statusCode = 400;
    const errors = [{ field: 'email', message: 'Invalid' }];
    
    errorResponse(res, message, statusCode, errors);
    
    expect(res.status).toHaveBeenCalledWith(statusCode);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode,
        message,
        errors,
      })
    );
  });

  it('should not include stack trace in response', () => {
    errorResponse(res, 'Error', 500);
    
    const callArgs = res.json.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('stack');
  });
});

describe('paginatedResponse', () => {
  let res;

  beforeEach(() => {
    res = global.mockResponse();
  });

  it('should send paginated response with correct structure', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const page = 1;
    const limit = 20;
    const total = 50;
    
    paginatedResponse(res, data, page, limit, total);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        statusCode: 200,
        data,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
          nextPage: 2,
          prevPage: null,
        },
      })
    );
  });

  it('should handle last page correctly', () => {
    const data = [{ id: 1 }];
    const page = 3;
    const limit = 20;
    const total = 50;
    
    paginatedResponse(res, data, page, limit, total);
    
    const callArgs = res.json.mock.calls[0][0];
    expect(callArgs.pagination.hasNext).toBe(false);
    expect(callArgs.pagination.nextPage).toBeNull();
    expect(callArgs.pagination.hasPrev).toBe(true);
    expect(callArgs.pagination.prevPage).toBe(2);
  });

  it('should handle single page correctly', () => {
    const data = [{ id: 1 }];
    const page = 1;
    const limit = 20;
    const total = 1;
    
    paginatedResponse(res, data, page, limit, total);
    
    const callArgs = res.json.mock.calls[0][0];
    expect(callArgs.pagination.hasNext).toBe(false);
    expect(callArgs.pagination.hasPrev).toBe(false);
    expect(callArgs.pagination.nextPage).toBeNull();
    expect(callArgs.pagination.prevPage).toBeNull();
  });
});

describe('createdResponse', () => {
  let res;

  beforeEach(() => {
    res = global.mockResponse();
  });

  it('should send created response with 201 status', () => {
    const data = { id: 1 };
    
    createdResponse(res, data);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        statusCode: 201,
        data,
      })
    );
  });
});

describe('noContentResponse', () => {
  let res;

  beforeEach(() => {
    res = global.mockResponse();
  });

  it('should send no content response with 204 status', () => {
    noContentResponse(res);
    
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('cachedResponse', () => {
  let res;

  beforeEach(() => {
    res = global.mockResponse();
  });

  it('should send cached response with cache info', () => {
    const data = { id: 1 };
    const cacheInfo = { hit: true, ttl: 3600 };
    
    cachedResponse(res, data, cacheInfo);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        statusCode: 200,
        data,
        cache: {
          hit: true,
          ttl: 3600,
        },
      })
    );
  });
});

