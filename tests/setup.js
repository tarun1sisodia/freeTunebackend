/**
 * Jest Setup File
 * Configures test environment and global mocks
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to silence console logs during tests
  // log: () => {},
  // debug: () => {},
  // info: () => {},
  // warn: () => {},
  // error: () => {},
};

// Global test utilities
global.mockRequest = (overrides = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  user: null,
  ...overrides,
});

global.mockResponse = () => {
  const res = {};
  const mockFn = () => res;
  res.status = mockFn;
  res.json = mockFn;
  res.send = mockFn;
  res.setHeader = mockFn;
  return res;
};

global.mockNext = () => {};

