import { logger } from "../utils/logger.js";
import { errorResponse } from "../utils/apiResponse.js";

/**
 * Centralized Express error handler.
 * - Handles both operational (trusted) and programming (unexpected) errors.
 * - Logs detailed error in development, minimal in production.
 * - Supports scalability via consistent error response interface and extensible structure.
 */
const errorHandler = (err, req, res, next) => {
  // Set default statusCode and status
  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong";
  const isOperational =
    typeof err.isOperational === "boolean"
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
  if (process.env.NODE_ENV === "development") {
    logger.error(`Error: ${message}`, logMeta);
    return res.status(statusCode).json({
      success: false,
      status: "error",
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
  logger.error("CRITICAL ERROR:", logMeta);
  return errorResponse(res, "An unexpected error occurred", 500);
};

/**
 * Custom error class for consistent error creation
 * - Useful for distinguishing operational errors.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Mark as trusted error
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export { errorHandler, AppError };
