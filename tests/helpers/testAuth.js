/**
 * Authentication Test Helpers
 * Utilities for testing authentication flows
 */

import jwt from 'jsonwebtoken';
import config from '../../src/config/index.js';
import { getSupabaseAdmin } from '../../src/database/connections/supabase.js';
import { createMockUser } from './mockData.js';

/**
 * Create test user in Supabase Auth
 */
export const createTestUser = async (userData = {}) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const mockUser = createMockUser(userData);

  const { data, error } = await supabase.auth.admin.createUser({
    email: mockUser.email,
    password: mockUser.password,
    email_confirm: true,
    user_metadata: {
      username: mockUser.username,
      full_name: mockUser.full_name,
    },
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  // Create user preferences
  await supabase
    .from('user_preferences')
    .insert({
      user_id: data.user.id,
      preferred_quality: 'high',
      auto_download: false,
      download_quality: 'medium',
      data_saver_mode: false,
      theme: 'dark',
    });

  return {
    ...data.user,
    password: mockUser.password, // Return password for login tests
  };
};

/**
 * Delete test user from Supabase Auth
 */
export const deleteTestUser = async (userId) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return;
  }

  try {
    // Delete user preferences first
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    // Delete auth user
    await supabase.auth.admin.deleteUser(userId);
  } catch (error) {
    // Ignore errors during cleanup
  }
};

/**
 * Generate test JWT token
 */
export const generateTestToken = (payload = {}) => {
  const defaultPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  return jwt.sign(
    { ...defaultPayload, ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

/**
 * Generate expired JWT token
 */
export const generateExpiredToken = (payload = {}) => {
  const defaultPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  return jwt.sign(
    { ...defaultPayload, ...payload },
    config.jwt.secret,
    { expiresIn: '0s' } // Already expired
  );
};

/**
 * Generate invalid JWT token
 */
export const generateInvalidToken = () => {
  return 'invalid.jwt.token';
};

/**
 * Login test user and get access token
 */
export const loginTestUser = async (email, password) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  // Use client for login (not admin)
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(
    config.supabase.url,
    config.supabase.anonKey
  );

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Login failed: ${error.message}`);
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user,
  };
};

/**
 * Create authenticated request header
 */
export const createAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Extract user ID from token
 */
export const extractUserIdFromToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded.userId || decoded.sub;
  } catch (error) {
    return null;
  }
};
