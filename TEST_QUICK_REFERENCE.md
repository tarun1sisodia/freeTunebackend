# FreeTune Backend - Test Quick Reference

## Quick Commands

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/integration/database/supabase.test.js
npm test -- tests/integration/database/redis.test.js
npm test -- tests/integration/database/mongodb.test.js
npm test -- tests/integration/database/schema.test.js

# Run tests by category
npm test -- tests/unit           # Unit tests only
npm test -- tests/integration    # Integration tests only

# Run tests with coverage
npm test -- --coverage

# Watch mode (for development)
npm run test:watch

# Run specific test case
npm test -- --testNamePattern="should connect to Supabase"
```

## Test Coverage Summary

| Component | Test File | Status |
|-----------|-----------|--------|
| **Database Connections** | | |
| Supabase/PostgreSQL | `integration/database/supabase.test.js` | ✅ Created |
| Redis/Upstash | `integration/database/redis.test.js` | ✅ Created |
| MongoDB/Mongoose | `integration/database/mongodb.test.js` | ✅ Created |
| Schema Validation | `integration/database/schema.test.js` | ✅ Created |
| **Helpers** | | |
| Mock Data | `helpers/mockData.js` | ✅ Created |
| Test Database | `helpers/testDatabase.js` | ✅ Created |
| Test Cache | `helpers/testCache.js` | ✅ Created |
| Test Auth | `helpers/testAuth.js` | ✅ Created |
| **Services** | | |
| Auth Service | `unit/services/auth.service.test.js` | ⏳ TODO |
| Analytics Service | `unit/services/analytics.service.test.js` | ⏳ TODO |
| Recommendation Service | `unit/services/recommendation.service.test.js` | ⏳ TODO |
| **Controllers** | | |
| Songs Controller | `integration/controllers/songs.controller.test.js` | ⏳ TODO |
| Playlist Controller | `integration/controllers/playlist.controller.test.js` | ⏳ TODO |
| User Controller | `integration/controllers/user.controller.test.js` | ⏳ TODO |
| Analytics Controller | `integration/controllers/analytics.controller.test.js` | ⏳ TODO |
| **API Endpoints** | | |
| Auth API | `integration/api/auth.test.js` | ✅ Exists |
| Songs API | `integration/api/songs.test.js` | ✅ Exists |
| Playlists API | `integration/api/playlists.test.js` | ⏳ TODO |
| User API | `integration/api/user.test.js` | ⏳ TODO |
| **External Services** | | |
| Cloudflare R2 | `integration/services/cloudflare-r2.test.js` | ⏳ TODO |
| Audio Processing | `integration/services/audio-processing.test.js` | ⏳ TODO |

## Test Execution Order

### Phase 1: Database Connectivity (Priority: CRITICAL)
```bash
npm test -- tests/integration/database/supabase.test.js
npm test -- tests/integration/database/redis.test.js
npm test -- tests/integration/database/mongodb.test.js
npm test -- tests/integration/database/schema.test.js
```

### Phase 2: Authentication (Priority: HIGH)
```bash
npm test -- tests/integration/api/auth.test.js
npm test -- tests/unit/middleware/auth.test.js
```

### Phase 3: Core Functionality (Priority: HIGH)
```bash
npm test -- tests/integration/api/songs.test.js
npm test -- tests/unit/utils/
npm test -- tests/unit/validators/
```

### Phase 4: Additional Features (Priority: MEDIUM)
```bash
npm test -- tests/integration/api/playlists.test.js
npm test -- tests/integration/api/analytics.test.js
npm test -- tests/integration/api/recommendations.test.js
```

## Common Test Patterns

### Testing Database Operations
```javascript
describe('Database Operation', () => {
  let testDataId;

  afterEach(async () => {
    // Cleanup
    if (testDataId) {
      await deleteTestData(testDataId);
      testDataId = null;
    }
  });

  test('should create data', async () => {
    const result = await createData();
    testDataId = result.id;
    expect(result).toBeDefined();
  });
});
```

### Testing API Endpoints
```javascript
import request from 'supertest';
import app from '../../../src/app.js';

describe('API Endpoint', () => {
  test('should return 200 on success', async () => {
    const response = await request(app)
      .get('/api/v1/endpoint')
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

### Testing with Authentication
```javascript
import { generateTestToken } from '../../helpers/testAuth.js';

test('should require authentication', async () => {
  const token = generateTestToken();
  
  const response = await request(app)
    .get('/api/v1/protected')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});
```

## Troubleshooting

### Issue: Tests timeout
**Solution**: Increase timeout in test file
```javascript
test('slow operation', async () => {
  // test code
}, 60000); // 60 second timeout
```

### Issue: Database connection failed
**Solution**: Check `.env.test` configuration
```bash
# Verify environment variables
cat .env.test

# Test connection manually
node -e "import('./src/database/connections/supabase.js').then(m => m.getSupabaseClient())"
```

### Issue: Tests affecting each other
**Solution**: Clean up properly in `afterEach`
```javascript
afterEach(async () => {
  await cleanupSupabaseTestData();
  await cleanupTestCache();
});
```

### Issue: Mock not working
**Solution**: Ensure mock is defined before import
```javascript
// Mock BEFORE import
jest.mock('@supabase/supabase-js');

// Then import
import { getSupabaseClient } from './connections/supabase';
```

## Environment Setup

### 1. Create Test Databases

**Supabase**: Create separate test project
- Go to https://supabase.com/dashboard
- Create new project (e.g., "freetune-test")
- Run migrations on test project
- Copy credentials to `.env.test`

**Redis**: Use separate test database
- Create new Upstash Redis database (free tier)
- Or use local Redis with different DB number
- Copy credentials to `.env.test`

**MongoDB**: Create test database
- Use MongoDB Atlas free tier
- Create separate cluster or database
- Copy connection string to `.env.test`

### 2. Install Dependencies

```bash
cd freeTuneBackend
npm install
```

### 3. Create .env.test

```bash
cp .env.example .env.test
# Edit .env.test with test credentials
```

### 4. Run Initial Tests

```bash
# Test database connections first
npm test -- tests/integration/database/
```

## CI/CD Integration

### GitHub Actions

The test suite runs automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Manual workflow dispatch

### Local Pre-commit Testing

```bash
# Install Husky (if not already)
npm install --save-dev husky
npx husky init

# Tests run automatically before commit
git commit -m "Your changes"
```

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Overall | >75% | TBD |
| Unit Tests | >80% | TBD |
| Integration Tests | >70% | TBD |
| Critical Paths | 100% | TBD |

### View Coverage Report

```bash
npm test -- --coverage
open coverage/index.html
```

## Performance Benchmarks

| Test Suite | Target Time |
|------------|-------------|
| Unit Tests | <5 seconds |
| Integration Tests | <30 seconds |
| E2E Tests | <60 seconds |
| Full Suite | <2 minutes |

## Next Steps

1. ✅ Set up test infrastructure
2. ✅ Create database connection tests
3. ⏳ Create service-level tests
4. ⏳ Create controller tests
5. ⏳ Create E2E tests
6. ⏳ Set up CI/CD pipeline
7. ⏳ Achieve coverage targets
8. ⏳ Performance optimization

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)

---

**Last Updated**: December 2025  
**Version**: 1.0.0
