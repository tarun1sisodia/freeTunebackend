/**
 * Authentication Service
 * Handles JWT tokens, password hashing, and user authentication
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import config from "../config/index.js";
import {
  getSupabaseClient,
  getSupabaseAdmin,
} from "../database/connections/supabase.js";
import ApiError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";
import { cacheSet, cacheGet, cacheDel } from "../database/connections/redis.js";

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
      throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn || "7d",
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId) {
    if (!config.jwt.secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign({ userId, type: "refresh" }, config.jwt.secret, {
      expiresIn: "30d",
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      if (!config.jwt.secret) {
        throw new Error("JWT_SECRET is not configured");
      }
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw ApiError.unauthorized("Token has expired");
      }
      if (error.name === "JsonWebTokenError") {
        throw ApiError.unauthorized("Invalid token");
      }
      throw error;
    }
  }

  /**
   * Generate email verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate password reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Register new user with Supabase Auth
   * Uses Supabase Auth for user management (no separate users table needed)
   */
  async registerUser({ email, password, username, fullName }) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      // Create user in Supabase Auth (handles everything)
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: {
            username: username || email.split("@")[0],
            full_name: fullName || "",
          },
        });

      if (authError) {
        logger.error("Supabase auth user creation failed:", authError);

        if (authError.message.includes("already registered")) {
          throw ApiError.conflict("User with this email already exists");
        }

        throw ApiError.internal("Failed to create user account");
      }

      // Create user preferences entry (using your existing schema!)
      const { data: prefsData, error: prefsError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: authData.user.id,
          preferred_quality: "high",
          auto_download: false,
          download_quality: "medium",
          data_saver_mode: false,
          theme: "dark",
          settings: {},
        })
        .select()
        .single();

      if (prefsError) {
        logger.error("User preferences creation failed:", prefsError);
        // Rollback: delete auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw ApiError.internal("Failed to create user preferences");
      }

      logger.info(`User registered successfully: ${email}`);

      return {
        user: authData.user,
        preferences: prefsData,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("User registration error:", error);
      throw ApiError.internal("Registration failed");
    }
  }

  /**
   * Login user with Supabase Auth
   */
  async loginUser({ email, password }) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.warn(`Login failed for ${email}: ${error.message}`);
        throw ApiError.unauthorized("Invalid email or password");
      }

      // Fetch user preferences (from your schema)
      const { data: userPrefs, error: prefsError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (prefsError) {
        logger.warn("User preferences not found, creating defaults");
        // Create default preferences if missing
        const { data: newPrefs } = await supabase
          .from("user_preferences")
          .insert({
            user_id: data.user.id,
            preferred_quality: "high",
            auto_download: false,
            download_quality: "medium",
            data_saver_mode: false,
            theme: "dark",
            settings: {},
          })
          .select()
          .single();

        logger.info(`User logged in successfully: ${email}`);

        return {
          user: data.user,
          preferences: newPrefs,
          session: data.session,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        };
      }

      logger.info(`User logged in successfully: ${email}`);

      return {
        user: data.user,
        preferences: userPrefs,
        session: data.session,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("Login error:", error);
      throw ApiError.internal("Login failed");
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logger.warn("Token refresh failed:", error.message);
        throw ApiError.unauthorized("Invalid or expired refresh token");
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
      logger.error("Token refresh error:", error);
      throw ApiError.internal("Token refresh failed");
    }
  }

  /**
   * Logout user (invalidate session)
   */
  async logoutUser(_accessToken) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error("Logout error:", error);
        throw ApiError.internal("Logout failed");
      }

      logger.info("User logged out successfully");
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("Logout error:", error);
      throw ApiError.internal("Logout failed");
    }
  }

  /**
   * Get user by ID (from Supabase Auth + preferences)
   */
  async getUserById(userId) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      // Get user from Supabase Auth
      const { data: authUser, error: authError } =
        await supabase.auth.admin.getUserById(userId);

      if (authError || !authUser) {
        throw ApiError.notFound("User not found");
      }

      // Get user preferences
      const { data: prefs, error: prefsError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (prefsError) {
        logger.warn(`Preferences not found for user ${userId}`);
      }

      return {
        id: authUser.user.id,
        email: authUser.user.email,
        ...authUser.user.user_metadata,
        preferences: prefs || null,
        email_verified: authUser.user.email_confirmed_at !== null,
        created_at: authUser.user.created_at,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("Get user error:", error);
      throw ApiError.internal("Failed to retrieve user");
    }
  }

  /**
   * Update user profile (user_metadata in Supabase Auth + preferences table)
   */
  async updateUserProfile(userId, updates) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      // Separate user metadata from preferences
      const {
        preferred_quality,
        auto_download,
        download_quality,
        data_saver_mode,
        theme,
        ...userMetadata
      } = updates;

      // Update Supabase Auth user_metadata if provided
      if (Object.keys(userMetadata).length > 0) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          { user_metadata: userMetadata },
        );

        if (authError) {
          logger.error("Auth metadata update error:", authError);
          throw ApiError.internal("Failed to update user metadata");
        }
      }

      // Update user_preferences table if preference fields provided
      const prefsUpdates = {};
      if (preferred_quality) prefsUpdates.preferred_quality = preferred_quality;
      if (auto_download !== undefined)
        prefsUpdates.auto_download = auto_download;
      if (download_quality) prefsUpdates.download_quality = download_quality;
      if (data_saver_mode !== undefined)
        prefsUpdates.data_saver_mode = data_saver_mode;
      if (theme) prefsUpdates.theme = theme;

      if (Object.keys(prefsUpdates).length > 0) {
        const { error: prefsError } = await supabase
          .from("user_preferences")
          .update({
            ...prefsUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (prefsError) {
          logger.error("Preferences update error:", prefsError);
          throw ApiError.internal("Failed to update preferences");
        }
      }

      logger.info(`Profile updated for user: ${userId}`);

      // Return updated user data
      return this.getUserById(userId);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("Update profile error:", error);
      throw ApiError.internal("Failed to update profile");
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      // Get user to verify current password
      const { data: authUser, error: userError } =
        await supabase.auth.admin.getUserById(userId);

      if (userError || !authUser) {
        throw ApiError.notFound("User not found");
      }

      // Verify current password by attempting sign in
      const verifySupabase = getSupabaseClient();
      const { error: signInError } =
        await verifySupabase.auth.signInWithPassword({
          email: authUser.user.email,
          password: currentPassword,
        });

      if (signInError) {
        throw ApiError.unauthorized("Current password is incorrect");
      }

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword },
      );

      if (updateError) {
        logger.error("Password change error:", updateError);
        throw ApiError.internal("Failed to change password");
      }

      logger.info(`Password changed for user: ${userId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("Change password error:", error);
      throw ApiError.internal("Failed to change password");
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw ApiError.internal("Authentication service unavailable");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

      if (error) {
        logger.error("Password reset request error:", error);
        // Don't reveal if email exists or not
      }

      logger.info(`Password reset requested for: ${email}`);
      return true;
    } catch (error) {
      logger.error("Password reset request error:", error);
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
        throw ApiError.internal("Authentication service unavailable");
      }

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "email",
      });

      if (error) {
        logger.error("Email verification error:", error);
        throw ApiError.badRequest("Invalid or expired verification token");
      }

      logger.info(`Email verified for user: ${data.user.id}`);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("Email verification error:", error);
      throw ApiError.internal("Email verification failed");
    }
  }
}

// Export singleton instance
export default new AuthService();
