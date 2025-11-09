import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { getSupabaseClient } from '../database/connections/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = await jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    throw ApiError.internal('Authentication error');
  }

  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  req.user = {
    id: user.id,
    email: user.email,
    ...decoded,
  };

  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      // Ignore token errors for optionalAuth; just don't attach user
      return next();
    }

    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        ...decoded,
      };
    }
  }

  next();
});

export { authMiddleware, optionalAuth };
