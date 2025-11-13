import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { getSupabaseClient } from '../database/connections/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided');
  }

  const token = authHeader.split(' ')[1];

  // Use Supabase's getUser method which validates the JWT internally
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw ApiError.internal('Authentication service unavailable');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  // Attach user info to request
  req.user = {
    id: user.id,
    email: user.email,
    ...user.user_metadata,
  };

  next();
});

/**
 * Optional Authentication Middleware
 * Attempts to verify token but doesn't fail if not present
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            ...user.user_metadata,
          };
        }
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  next();
});

export { authMiddleware, optionalAuth };
