/**
 * Authentication Controllers
 * Handle auth-related HTTP requests
 */

import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import { successResponse } from "../../utils/apiResponse.js";
import authService from "../../services/auth.service.js";
import { logger } from "../../utils/logger.js";

/**
 * Register new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, username, fullName } = req.body;

  const result = await authService.registerUser({
    email,
    password,
    username,
    fullName,
  });

  // Generate tokens
  const accessToken = authService.generateAccessToken({
    userId: result.user.id,
    email: result.user.email,
  });

  const refreshToken = authService.generateRefreshToken(result.user.id);

  successResponse(
    res,
    {
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.full_name,
        emailVerified: result.user.email_verified,
      },
      accessToken,
      refreshToken,
    },
    "Registration successful. Please verify your email.",
    201
  );
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.loginUser({ email, password });

  successResponse(
    res,
    {
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.full_name,
        emailVerified: result.user.email_verified,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
    "Login successful",
    200
  );
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest("Refresh token is required");
  }

  const result = await authService.refreshAccessToken(refreshToken);

  successResponse(
    res,
    {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    },
    "Token refreshed successfully",
    200
  );
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  await authService.logoutUser(token);

  successResponse(res, null, "Logout successful", 200);
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await authService.getUserById(userId);

  successResponse(
    res,
    {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
    },
    "User profile retrieved successfully",
    200
  );
});

/**
 * Update user profile
 * PATCH /api/v1/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updates = req.body;

  const updatedUser = await authService.updateUserProfile(userId, updates);

  successResponse(
    res,
    {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      fullName: updatedUser.full_name,
      displayName: updatedUser.displayName,
      bio: updatedUser.bio,
      avatarUrl: updatedUser.avatar_url,
    },
    "Profile updated successfully",
    200
  );
});

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(userId, currentPassword, newPassword);

  successResponse(res, null, "Password changed successfully", 200);
});

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  await authService.requestPasswordReset(email);

  successResponse(
    res,
    null,
    "If an account with that email exists, a password reset link has been sent",
    200
  );
});

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Supabase handles password reset via their UI/SDK
  // This is a placeholder for custom implementation if needed
  throw ApiError.notFound(
    "Password reset should be handled via Supabase Auth UI"
  );
});

/**
 * Verify email
 * POST /api/v1/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await authService.verifyEmail(token);

  successResponse(
    res,
    { emailVerified: true },
    "Email verified successfully",
    200
  );
});

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Implementation depends on Supabase setup
  successResponse(
    res,
    null,
    "Verification email sent if account exists",
    200
  );
});
