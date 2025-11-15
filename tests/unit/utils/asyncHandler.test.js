/**
 * Unit Tests for asyncHandler utility
 */

import { asyncHandler } from '../../../src/utils/asyncHandler.js';
import ApiError from '../../../src/utils/apiError.js';

describe('asyncHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.mockRequest();
    res = global.mockResponse();
    next = global.mockNext();
  });

  it('should handle synchronous functions without errors', () => {
    const handler = (req, res) => {
      res.json({ success: true });
    };
    
    const wrapped = asyncHandler(handler);
    wrapped(req, res, next);
    
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle synchronous functions with errors', () => {
    const handler = (req, res) => {
      throw new Error('Test error');
    };
    
    const wrapped = asyncHandler(handler);
    wrapped(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle async functions that resolve', async () => {
    const handler = async (req, res) => {
      await Promise.resolve();
      res.json({ success: true });
    };
    
    const wrapped = asyncHandler(handler);
    wrapped(req, res, next);
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle async functions that reject', async () => {
    const handler = async (req, res) => {
      await Promise.reject(new Error('Async error'));
    };
    
    const wrapped = asyncHandler(handler);
    wrapped(req, res, next);
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle ApiError correctly', async () => {
    const handler = async (req, res) => {
      throw ApiError.badRequest('Validation failed');
    };
    
    const wrapped = asyncHandler(handler);
    wrapped(req, res, next);
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
      })
    );
  });

  it('should handle promises that return values', async () => {
    const handler = async (req, res) => {
      const data = await Promise.resolve({ id: 1 });
      res.json(data);
    };
    
    const wrapped = asyncHandler(handler);
    wrapped(req, res, next);
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
    expect(next).not.toHaveBeenCalled();
  });
});

