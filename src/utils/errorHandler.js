import logger from '../utils/logger.js';

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error(`Error: ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // Production
  if (err.isOperational) {
    logger.error(`Operational Error: ${err.message}`);
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or unknown error
  logger.error('CRITICAL ERROR:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { AppError, errorHandler, asyncHandler };
