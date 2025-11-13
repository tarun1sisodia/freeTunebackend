import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: max || config.rateLimit.maxRequests,
    message: message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many API requests from this IP'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  'Too many authentication attempts'
);

const streamLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30,
  'Too many stream requests'
);

const searchLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  20,
  'Too many search requests'
);

export { apiLimiter, authLimiter, streamLimiter, searchLimiter };
