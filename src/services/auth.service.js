/**
 * Authentication Service
 * Handles JWT tokens, password hashing, and user authentication
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../config/index.js';
import { getSupabaseClient, getSupabaseAdmin } from '../database/connections/supabase.js';
import ApiError from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { cacheSet, cacheGet, cacheDel } from '../database/connections/redis.js';

class AuthService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload) {
    if (!config.jwt.secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn || '7d',
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId) {
    if (!config.jwt.secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: '30d' }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      if (!config.jwt.secret) {
        throw new Error('JWT_SECRET is not configured');
      }
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw ApiError.unauthorized('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Generate email verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate password reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Register new user with Supabase Auth
   */
  async registerUser({ email, password, username, fullName }) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw ApiError.conflict('User with this email already exists');
      }

      // Check if username is taken
      if (username) {
        const { data: existingUsername } = await supabase
          .from('users')
          .select('id, username')
          .eq('username', username)
          .single();

        if (existingUsername) {
          throw ApiError.conflict('Username already taken');
        }
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // Require email verification
        user_metadata: {
          username: username || email.split('@')[0],
          full_name: fullName || '',
        },
      });

      if (authError) {
        logger.error('Supabase auth user creation failed:', authError);
        throw ApiError.internal('Failed to create user account');
      }

      // Create user profile in database
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          username: username || email.split('@')[0],
          full_name: fullName || '',
          email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        logger.error('Database user profile creation failed:', dbError);
        // Rollback: delete auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw ApiError.internal('Failed to create user profile');
      }

      logger.info(`User registered successfully: ${email}`);

      return {
        user: userData,
        authUser: authData.user,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('User registration error:', error);
      throw ApiError.internal('Registration failed');
    }
  }

  /**
   * Login user with Supabase Auth
   */
  async loginUser({ email, password }) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.warn(`Login failed for ${email}: ${error.message}`);
        throw ApiError.unauthorized('Invalid email or password');
      }

      // Fetch user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        logger.error('Failed to fetch user profile:', profileError);
        throw ApiError.internal('Failed to retrieve user profile');
      }

      logger.info(`User logged in successfully: ${email}`);

      return {
        user: userProfile,
        session: data.session,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Login error:', error);
      throw ApiError.internal('Login failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logger.warn('Token refresh failed:', error.message);
        throw ApiError.unauthorized('Invalid or expired refresh token');
      }

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Token refresh error:', error);
      throw ApiError.internal('Token refresh failed');
    }
  }

  /**
   * Logout user (invalidate session)
   */
  async logoutUser(_accessToken) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('Logout error:', error);
        throw ApiError.internal('Logout failed');
      }

      logger.info('User logged out successfully');
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Logout error:', error);
      throw ApiError.internal('Logout failed');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        throw ApiError.notFound('User not found');
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get user error:', error);
      throw ApiError.internal('Failed to retrieve user');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Profile update error:', error);
        throw ApiError.internal('Failed to update profile');
      }

      logger.info(`Profile updated for user: ${userId}`);
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Update profile error:', error);
      throw ApiError.internal('Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      // Get user to verify current password
      const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId);

      if (userError || !authUser) {
        throw ApiError.notFound('User not found');
      }

      // Verify current password by attempting sign in
      const verifySupabase = getSupabaseClient();
      const { error: signInError } = await verifySupabase.auth.signInWithPassword({
        email: authUser.user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw ApiError.unauthorized('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        logger.error('Password change error:', updateError);
        throw ApiError.internal('Failed to change password');
      }

      logger.info(`Password changed for user: ${userId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Change password error:', error);
      throw ApiError.internal('Failed to change password');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

      if (error) {
        logger.error('Password reset request error:', error);
        // Don't reveal if email exists or not
      }

      logger.info(`Password reset requested for: ${email}`);
      return true;
    } catch (error) {
      logger.error('Password reset request error:', error);
      // Always return success to prevent email enumeration
      return true;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal('Authentication service unavailable');
      }

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (error) {
        logger.error('Email verification error:', error);
        throw ApiError.badRequest('Invalid or expired verification token');
      }

      logger.info(`Email verified for user: ${data.user.id}`);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Email verification error:', error);
      throw ApiError.internal('Email verification failed');
    }
  }
}

// Export singleton instance
export default new AuthService();
