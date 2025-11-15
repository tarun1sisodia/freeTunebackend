/**
 * Unit Tests for Authentication Validators
 */

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
} from '../../../src/validators/auth.validators.js';
import { z } from 'zod';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          username: 'testuser',
          fullName: 'Test User',
        },
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'invalid-email',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'weak',
          confirmPassword: 'weak',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'password123!',
          confirmPassword: 'password123!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password!',
          confirmPassword: 'Password!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Different123!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid username format', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          username: 'invalid username!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'anypassword',
        },
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'invalid-email',
          password: 'password',
        },
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: '',
        },
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        body: {
          refreshToken: 'valid-refresh-token',
        },
      };

      const result = refreshTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', () => {
      const invalidData = {
        body: {
          refreshToken: '',
        },
      };

      const result = refreshTokenSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate valid email', () => {
      const validData = {
        body: {
          email: 'test@example.com',
        },
      };

      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'invalid-email',
        },
      };

      const result = forgotPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate valid reset password data', () => {
      const validData = {
        body: {
          token: 'reset-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        },
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        body: {
          token: 'reset-token',
          password: 'NewPassword123!',
          confirmPassword: 'Different123!',
        },
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid change password data', () => {
      const validData = {
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!',
        },
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject when new password matches current password', () => {
      const invalidData = {
        body: {
          currentPassword: 'Password123!',
          newPassword: 'Password123!',
          confirmNewPassword: 'Password123!',
        },
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate valid profile update', () => {
      const validData = {
        body: {
          username: 'newusername',
          fullName: 'New Name',
          bio: 'User bio',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const validData = {
        body: {
          username: 'newusername',
        },
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL for avatar', () => {
      const invalidData = {
        body: {
          avatarUrl: 'not-a-url',
        },
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject bio that is too long', () => {
      const invalidData = {
        body: {
          bio: 'a'.repeat(501),
        },
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

