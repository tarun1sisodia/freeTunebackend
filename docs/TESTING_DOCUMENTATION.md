# FreeTune Backend - Comprehensive Testing Documentation

## Table of Contents
1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Test Structure](#test-structure)
4. [Running Tests](#running-tests)
5. [Service Integration Tests](#service-integration-tests)
6. [API Testing](#api-testing)
7. [Database Schema Testing](#database-schema-testing)
8. [External Services Testing](#external-services-testing)
9. [Coverage Goals](#coverage-goals)
10. [Essential Tests to Implement](#essential-tests-to-implement)
11. [CI/CD Integration](#cicd-integration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This document provides a comprehensive guide for testing the FreeTune backend application. The backend uses:
- **Supabase (PostgreSQL)** - Primary database for songs, users, playlists
- **Upstash Redis** - Caching layer for performance optimization
- **MongoDB Atlas** - Analytics and recommendation data
- **Cloudflare R2** - Audio file storage (S3-compatible)
- **Express.js** - REST API framework

---

## Testing Strategy

### Test Pyramid
```
                   /\
                  /  \
                 / E2E \          (10% - Full system tests)
                /______\
               /        \
              / Integration \     (30% - API & Service tests)
             /____________\
            /              \
           /   Unit Tests   \    (60% - Functions, Utils, Validators)
          /__________________\
```

### Test Categories

1. **Unit Tests** (60% of tests)
   - Utility functions
   - Middleware
   - Validators
   - Helper functions
   - Models

2. **Integration Tests** (30% of tests)
   - API endpoints
   - Controllers
   - Services
   - Database operations
   - Cache operations

3. **E2E Tests** (10% of tests)
   - Complete user flows
   - Authentication flows
   - Song upload/stream flows
   - Playlist management

---

## Test Structure

```
freeTuneBackend/
├── tests/
│   ├── setup.js                          # Jest global setup
│   ├── teardown.js                       # Jest global teardown (NEW)
│   ├── helpers/                          # Test helpers (NEW)
│   │   ├── testDatabase.js               # DB test utilities
│   │   ├── testCache.js                  # Redis test utilities
│   │   ├── testAuth.js                   # Auth test helpers
│   │   └── mockData.js                   # Test data factories
│   ├── unit/                             # Unit tests
│   │   ├── utils/
│   │   │   ├── apiError.test.js
│   │   │   ├── apiResponse.test.js
│   │   │   ├── asyncHandler.test.js
│   │   │   ├── cacheHelper.test.js
│   │   │   ├── logger.test.js            # (NEW)
│   │   │   └── modelTransformers.test.js # (NEW)
│   │   ├── middleware/
│   │   │   ├── auth.test.js
│   │   │   ├── rateLimiter.test.js
│   │   │   └── validator.test.js
│   │   ├── validators/
│   │   │   ├── auth.validators.test.js
│   │   │   ├── song.validators.test.js   # (NEW)
│   │   │   └── playlist.validators.test.js # (NEW)
│   │   └── services/                     # (NEW)
│   │       ├── auth.service.test.js
│   │       ├── analytics.service.test.js
│   │       └── recommendation.service.test.js
│   ├── integration/                      # Integration tests
│   │   ├── database/                     # (NEW)
│   │   │   ├── supabase.test.js          # Supabase connection tests
│   │   │   ├── redis.test.js             # Redis connection tests
│   │   │   ├── mongodb.test.js           # MongoDB connection tests
│   │   │   └── schema.test.js            # Database schema validation
│   │   ├── services/                     # (NEW)
│   │   │   ├── cloudflare-r2.test.js     # R2 storage tests
│   │   │   ├── audio-processing.test.js  # Audio upload tests
│   │   │   └── caching.test.js           # Cache integration tests
│   │   ├── controllers/
│   │   │   ├── healthcheck.test.js
│   │   │   ├── songs.controller.test.js  # (NEW)
│   │   │   ├── playlist.controller.test.js # (NEW)
│   │   │   ├── user.controller.test.js   # (NEW)
│   │   │   ├── analytics.controller.test.js # (NEW)
│   │   │   └── recommendations.controller.test.js # (NEW)
│   │   └── api/
│   │       ├── auth.test.js
│   │       ├── songs.test.js
│   │       ├── playlists.test.js         # (NEW)
│   │       ├── user.test.js              # (NEW)
│   │       ├── analytics.test.js         # (NEW)
│   │       ├── recommendations.test.js   # (NEW)
│   │       └── routes.test.js
│   └── e2e/                              # (NEW)
│       ├── auth-flow.test.js             # Complete auth flow
│       ├── song-lifecycle.test.js        # Upload to stream flow
│       └── playlist-flow.test.js         # Playlist CRUD flow
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/utils/apiError.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="authentication"

# Run only integration tests
npm test -- tests/integration

# Run only unit tests
npm test -- tests/unit

# Run tests with verbose output
npm test -- --verbose

# Run tests in specific order
npm test -- --runInBand
```

### Environment Setup

Create `.env.test` file:
```bash
# Test Database (Use separate test instances!)
NODE_ENV=test

# Supabase Test Instance
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key

# Redis Test Instance (or use local Redis)
REDIS_URL=https://your-test-redis.upstash.io
REDIS_TOKEN=your_test_redis_token

# MongoDB Test Instance
MONGODB_URI=mongodb+srv://test:password@test-cluster.mongodb.net/
MONGODB_DB_NAME=freeTune_test

# Cloudflare R2 Test Bucket
R2_ACCOUNT_ID=your_test_account
R2_ACCESS_KEY_ID=your_test_key
R2_SECRET_ACCESS_KEY=your_test_secret
R2_BUCKET_NAME=freetune-test
R2_PUBLIC_URL=https://test-bucket.r2.dev

# JWT Test Secret
JWT_SECRET=test_jwt_secret_key_12345
JWT_EXPIRES_IN=1h

# Test API Settings
PORT=3001
API_VERSION=v1
```

⚠️ **IMPORTANT**: Always use separate test instances to avoid polluting production data!

---

## Service Integration Tests

### 1. Supabase (PostgreSQL) Tests

**File**: `tests/integration/database/supabase.test.js`

**Test Cases**:
```javascript
describe('Supabase Connection', () => {
  // Connection tests
  test('should connect to Supabase successfully')
  test('should create client with correct configuration')
  test('should handle connection failures gracefully')
  
  // Authentication tests
  test('should authenticate with anon key')
  test('should authenticate with service role key')
  test('should fail with invalid credentials')
  
  // Query tests
  test('should execute SELECT query')
  test('should execute INSERT query')
  test('should execute UPDATE query')
  test('should execute DELETE query')
  test('should handle transaction rollback')
  
  // RLS (Row Level Security) tests
  test('should enforce RLS policies for users')
  test('should allow admin access with service role')
  test('should restrict access based on user_id')
});
```

### 2. Redis (Upstash) Tests

**File**: `tests/integration/database/redis.test.js`

**Test Cases**:
```javascript
describe('Redis Cache', () => {
  // Connection tests
  test('should connect to Redis successfully')
  test('should handle connection failures gracefully')
  test('should reconnect after connection loss')
  
  // Basic operations
  test('should SET and GET a value')
  test('should SET with TTL and expire correctly')
  test('should DELETE a key')
  test('should check key EXISTS')
  test('should handle missing keys gracefully')
  
  // Advanced operations
  test('should SET JSON data')
  test('should GET and parse JSON data')
  test('should handle malformed JSON')
  test('should increment counter (INCR)')
  test('should work with hash operations (HSET, HGET)')
  
  // Performance tests
  test('should handle 1000 concurrent operations')
  test('should complete operations within 100ms')
});
```

### 3. MongoDB (Mongoose) Tests

**File**: `tests/integration/database/mongodb.test.js`

**Test Cases**:
```javascript
describe('MongoDB Connection', () => {
  // Connection tests
  test('should connect to MongoDB successfully')
  test('should handle connection failures')
  test('should reconnect after disconnection')
  
  // Model tests
  test('should create document with valid schema')
  test('should reject document with invalid schema')
  test('should validate required fields')
  test('should apply default values')
  
  // CRUD operations
  test('should create new document')
  test('should find document by ID')
  test('should update document')
  test('should delete document')
  test('should perform aggregation queries')
  
  // Index tests
  test('should use indexes for queries')
  test('should enforce unique constraints')
});
```

### 4. Cloudflare R2 Tests

**File**: `tests/integration/services/cloudflare-r2.test.js`

**Test Cases**:
```javascript
describe('Cloudflare R2 Storage', () => {
  // Connection tests
  test('should connect to R2 with valid credentials')
  test('should fail with invalid credentials')
  test('should verify bucket exists')
  
  // Upload tests
  test('should upload audio file to R2')
  test('should upload with correct content type')
  test('should generate correct R2 key path')
  test('should handle large file uploads (>50MB)')
  test('should reject invalid file types')
  
  // Download tests
  test('should generate presigned URL')
  test('should download file from R2')
  test('should stream file chunks')
  
  // Delete tests
  test('should delete file from R2')
  test('should handle deletion of non-existent file')
  
  // Metadata tests
  test('should store file metadata')
  test('should retrieve file metadata')
  test('should list files in bucket')
});
```

---

## API Testing

### Authentication API Tests

**File**: `tests/integration/api/auth.test.js`

**Endpoints to Test**:
```javascript
// Registration
POST /api/v1/auth/register
  ✓ Valid registration
  ✓ Duplicate email rejection
  ✓ Invalid email format
  ✓ Weak password rejection
  ✓ Password mismatch

// Login
POST /api/v1/auth/login
  ✓ Valid credentials
  ✓ Invalid credentials
  ✓ Non-existent user
  ✓ Returns JWT token
  ✓ Sets refresh token

// Token Refresh
POST /api/v1/auth/refresh
  ✓ Valid refresh token
  ✓ Invalid refresh token
  ✓ Expired refresh token

// User Profile
GET /api/v1/auth/me
  ✓ Authenticated user
  ✓ Unauthenticated request
  ✓ Includes user preferences

// Logout
POST /api/v1/auth/logout
  ✓ Clears session
  ✓ Invalidates refresh token
```

### Songs API Tests

**File**: `tests/integration/api/songs.test.js`

**Endpoints to Test**:
```javascript
// Get Songs
GET /api/v1/songs
  ✓ Returns paginated songs
  ✓ Filters by artist
  ✓ Filters by album
  ✓ Searches by title
  ✓ Sorts by popularity

// Get Single Song
GET /api/v1/songs/:id
  ✓ Valid song ID
  ✓ Invalid song ID
  ✓ Non-existent song
  ✓ Returns complete metadata

// Upload Song (Authenticated)
POST /api/v1/songs/upload
  ✓ Valid audio file upload
  ✓ Extracts metadata
  ✓ Uploads to R2
  ✓ Creates database entry
  ✓ Rejects invalid format
  ✓ Requires authentication

// Stream Song
GET /api/v1/songs/:id/stream
  ✓ Streams audio file
  ✓ Supports range requests
  ✓ Returns correct content-type
  ✓ Increments play count
  ✓ Logs user interaction

// Update Song
PATCH /api/v1/songs/:id
  ✓ Updates metadata
  ✓ Requires authentication
  ✓ Validates ownership

// Delete Song
DELETE /api/v1/songs/:id
  ✓ Deletes from database
  ✓ Deletes from R2
  ✓ Requires authentication
  ✓ Validates ownership
```

### Playlists API Tests

**File**: `tests/integration/api/playlists.test.js`

### Analytics API Tests

**File**: `tests/integration/api/analytics.test.js`

### Recommendations API Tests

**File**: `tests/integration/api/recommendations.test.js`

---

## Database Schema Testing

**File**: `tests/integration/database/schema.test.js`

### PostgreSQL Schema Validation

```javascript
describe('Database Schema Validation', () => {
  describe('songs table', () => {
    test('should have all required columns')
    test('should enforce NOT NULL constraints')
    test('should have correct data types')
    test('should have UUID primary key')
    test('should have performance indexes')
    test('should have full-text search index')
    test('should have auto-update triggers')
  });
  
  describe('user_interactions table', () => {
    test('should have foreign key to songs')
    test('should enforce action_type CHECK constraint')
    test('should allow CASCADE delete')
    test('should have indexes on user_id and song_id')
  });
  
  describe('playlists table', () => {
    test('should store song_ids as array')
    test('should validate UUID array format')
    test('should have user_id index')
  });
  
  describe('user_preferences table', () => {
    test('should have user_id as primary key')
    test('should have default values')
    test('should store JSONB settings')
  });
  
  describe('Triggers and Functions', () => {
    test('should auto-update updated_at on UPDATE')
    test('should maintain referential integrity')
  });
});
```

### Migration Tests

```javascript
describe('Database Migrations', () => {
  test('001_initial_schema.sql should execute successfully')
  test('002_add_album_art.sql should execute successfully')
  test('003_enable_rls.sql should execute successfully')
  test('migrations should be idempotent')
  test('should rollback on migration failure')
});
```

---

## External Services Testing

### Test Doubles Strategy

For external services, use the following approach:

1. **Unit Tests**: Mock all external services
2. **Integration Tests**: Use test instances or docker containers
3. **E2E Tests**: Use staging/test environments

### Mocking External Services

```javascript
// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  })),
}));

// Mock Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

// Mock MongoDB
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  model: jest.fn(),
}));

// Mock Cloudflare R2
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));
```

---

## Coverage Goals

### Overall Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Unit Tests | >80% | TBD |
| Integration Tests | >70% | TBD |
| E2E Tests | >50% | TBD |
| **Overall** | **>75%** | **TBD** |

### Critical Paths (Must have 100% coverage)

1. Authentication flows
2. Payment processing (if implemented)
3. Data validation
4. Security middleware
5. Database migrations

### Generate Coverage Report

```bash
# Generate HTML coverage report
npm test -- --coverage --coverageDirectory=coverage

# View coverage report
open coverage/index.html

# Check coverage thresholds
npm test -- --coverage --coverageThreshold='{"global":{"branches":75,"functions":75,"lines":75,"statements":75}}'
```

---

## Essential Tests to Implement

### Priority 1: Critical (Must Implement)

1. **Database Connection Tests**
   - [ ] Supabase connection and queries
   - [ ] Redis connection and caching
   - [ ] MongoDB connection and models
   - [ ] Connection failure handling

2. **Authentication Tests**
   - [ ] User registration
   - [ ] User login
   - [ ] Token validation
   - [ ] Token refresh
   - [ ] Logout and session invalidation

3. **Authorization Tests**
   - [ ] Protected route access
   - [ ] Role-based access control
   - [ ] Resource ownership validation

4. **Data Validation Tests**
   - [ ] Input validation (Zod schemas)
   - [ ] Request body validation
   - [ ] Query parameter validation
   - [ ] File upload validation

### Priority 2: Important (Should Implement)

5. **Song Management Tests**
   - [ ] Song upload with metadata extraction
   - [ ] Song streaming with range requests
   - [ ] Song search and filtering
   - [ ] Play count tracking

6. **Playlist Tests**
   - [ ] Create, read, update, delete playlists
   - [ ] Add/remove songs from playlist
   - [ ] Playlist visibility (public/private)

7. **Caching Tests**
   - [ ] Cache hit/miss scenarios
   - [ ] Cache invalidation
   - [ ] TTL expiration
   - [ ] Cache performance

8. **File Storage Tests**
   - [ ] R2 upload and download
   - [ ] Presigned URL generation
   - [ ] File deletion
   - [ ] Storage quota validation

### Priority 3: Nice to Have

9. **Analytics Tests**
   - [ ] Listening history tracking
   - [ ] Popular songs aggregation
   - [ ] User activity analytics

10. **Recommendation Tests**
    - [ ] Recommendation algorithm
    - [ ] Personalized recommendations
    - [ ] Trending songs

11. **Performance Tests**
    - [ ] API response times
    - [ ] Concurrent user load
    - [ ] Database query optimization
    - [ ] Cache efficiency

12. **Error Handling Tests**
    - [ ] Global error handler
    - [ ] API error responses
    - [ ] Logging error details

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x]
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm test -- tests/unit
      
      - name: Run integration tests
        run: npm test -- tests/integration
        env:
          NODE_ENV: test
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          REDIS_URL: redis://localhost:6379
      
      - name: Generate coverage report
        run: npm test -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Check coverage threshold
        run: npm test -- --coverage --coverageThreshold='{"global":{"branches":75,"functions":75,"lines":75,"statements":75}}'
```

### Pre-commit Hooks

Install Husky:
```bash
npm install --save-dev husky
npx husky init
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
npm run lint
npm test -- --bail --findRelatedTests
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

**Symptoms**: Tests hang or exceed timeout

**Solutions**:
```javascript
// Increase timeout in jest.config.json
{
  "testTimeout": 30000
}

// Or per test
test('slow test', async () => {
  // ...
}, 60000); // 60 second timeout
```

#### 2. Database Connection Errors

**Symptoms**: "Connection refused" or "Authentication failed"

**Solutions**:
- Verify `.env.test` configuration
- Ensure test database instances are running
- Check network connectivity
- Verify credentials

#### 3. Mock Not Working

**Symptoms**: Tests use real services instead of mocks

**Solutions**:
```javascript
// Ensure mocks are defined before imports
jest.mock('@supabase/supabase-js');
import { getSupabaseClient } from './connections/supabase';
```

#### 4. Redis Cache Pollution

**Symptoms**: Tests affect each other

**Solutions**:
```javascript
// Clear cache before/after each test
beforeEach(async () => {
  await cacheFlush();
});

afterEach(async () => {
  await cacheFlush();
});
```

#### 5. Test Data Cleanup

**Symptoms**: Tests fail due to existing data

**Solutions**:
```javascript
// Clean up test data after each test
afterEach(async () => {
  await supabase.from('songs').delete().neq('id', '');
  await supabase.from('playlists').delete().neq('id', '');
});
```

---

## Test Data Factories

Create reusable test data factories in `tests/helpers/mockData.js`:

```javascript
export const createMockUser = (overrides = {}) => ({
  id: uuidv4(),
  email: 'test@example.com',
  password: 'Password123!',
  username: 'testuser',
  ...overrides,
});

export const createMockSong = (overrides = {}) => ({
  id: uuidv4(),
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  duration_ms: 180000,
  r2_key: 'songs/test-song.mp3',
  ...overrides,
});

export const createMockPlaylist = (overrides = {}) => ({
  id: uuidv4(),
  user_id: uuidv4(),
  name: 'Test Playlist',
  song_ids: [],
  ...overrides,
});
```

---

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Test Isolation**: Tests should not depend on each other
3. **Fast Tests**: Unit tests < 100ms, Integration tests < 1s
4. **Descriptive Names**: Test names should describe expected behavior
5. **One Assertion**: Prefer single logical assertion per test
6. **Clean Up**: Always clean up test data and connections
7. **Use Factories**: Create test data with factories
8. **Mock External Services**: Don't hit real services in unit tests
9. **Test Edge Cases**: Include boundary conditions and error cases
10. **Maintain Tests**: Keep tests updated with code changes

---

## Next Steps

1. **Set up test environments** for Supabase, Redis, and MongoDB
2. **Implement Priority 1 tests** (database and auth)
3. **Add test helpers** and mock data factories
4. **Set up CI/CD pipeline** with GitHub Actions
5. **Monitor coverage** and aim for >75% overall
6. **Document findings** and update this guide

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Redis Testing Best Practices](https://redis.io/docs/getting-started/testing/)
- [MongoDB Testing Guide](https://www.mongodb.com/docs/manual/testing/)

---

**Last Updated**: December 2025  
**Version**: 1.0.0  
**Maintainer**: FreeTune Development Team
