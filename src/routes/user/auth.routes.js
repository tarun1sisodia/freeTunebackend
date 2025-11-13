/**
 * Authentication Routes
 * Define all auth-related endpoints
 */

import { Router } from "express";
import * as authController from "../../controllers/user/auth.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validator.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  resendVerificationSchema,
} from "../../validators/auth.validators.js";

const router = Router();

/**
 * Public Routes
 */

// POST /api/v1/auth/register - Register new user
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);

// POST /api/v1/auth/login - Login user
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login
);

// POST /api/v1/auth/refresh-token - Refresh access token
router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  authController.refreshToken
);

// POST /api/v1/auth/forgot-password - Request password reset
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// POST /api/v1/auth/reset-password - Reset password with token
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

// POST /api/v1/auth/verify-email - Verify email with token
router.post(
  "/verify-email",
  validate(verifyEmailSchema),
  authController.verifyEmail
);

// POST /api/v1/auth/resend-verification - Resend verification email
router.post(
  "/resend-verification",
  authLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);

/**
 * Protected Routes (require authentication)
 */

// GET /api/v1/auth/me - Get current user
router.get("/me", authMiddleware, authController.getCurrentUser);

// PATCH /api/v1/auth/profile - Update user profile
router.patch(
  "/profile",
  authMiddleware,
  validate(updateProfileSchema),
  authController.updateProfile
);

// POST /api/v1/auth/change-password - Change password
router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword
);

// POST /api/v1/auth/logout - Logout user
router.post("/logout", authMiddleware, authController.logout);

export default router;
