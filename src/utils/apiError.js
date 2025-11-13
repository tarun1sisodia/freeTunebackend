import { logger } from './logger.js';
import { errorResponse } from './apiResponse.js';
import { ENVIRONMENTS, LOG_LEVELS } from './constants.js';
/**
 * Custom API Error class for handling application errors
 * Extends native Error class with additional properties
 * @class ApiError
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Create an API Error
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} errors - Array of error details
   * @param {string} stack - Stack trace (optional)
   * @param {boolean} isOperational - Whether error is operational (true) or programming error (false)
   */
  constructor(
    statusCode,
    message = 'Something went wrong',
    errors = [],
    stack = '',
    isOperational = true,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Static factory methods for common HTTP errors
   */
  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, [], '', false);
  }

  static validation(errors = []) {
    return new ApiError(400, 'Validation failed', errors);
  }
}

/**
 * Centralized Express error handler.
 * - Handles both operational (trusted) and programming (unexpected) errors.
 * - Logs detailed error in development, minimal in production.
 * - Supports scalability via consistent error response interface and extensible structure.
 */
const errorHandler = (err, req, res, _next) => {
  // Set default statusCode and status
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  const isOperational =
    typeof err.isOperational === 'boolean'
      ? err.isOperational
      : statusCode < 500;

  // Enhanced logging context
  const logMeta = {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode,
    ...(err.errors && { errors: err.errors }),
  };

  // In development, show the full error object
  if (process.env.NODE_ENV === ENVIRONMENTS.DEVELOPMENT) {
    logger.error(`Error: ${message}`, logMeta);
    return res.status(statusCode).json({
      success: false,
      status: LOG_LEVELS.ERROR,
      message,
      error: {
        ...err,
        stack: err.stack,
      },
    });
  }

  // In production, hide stack traces for operational errors
  if (isOperational) {
    logger.error(`Operational Error: ${message}`, logMeta);
    return errorResponse(res, message, statusCode, err.errors || null);
  }

  // Unknown or programming error: log and send generic message
  logger.error('CRITICAL ERROR:', logMeta);
  return errorResponse(res, 'An unexpected error occurred', 500);
};

export { errorHandler };
export default ApiError;
