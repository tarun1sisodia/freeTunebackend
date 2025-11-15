# Test Suite Documentation

This directory contains comprehensive test cases for the FreeTune Backend application.

## Test Structure

```
tests/
├── setup.js                          # Jest configuration and global mocks
├── unit/                             # Unit tests
│   ├── utils/                        # Utility function tests
│   │   ├── apiError.test.js
│   │   ├── apiResponse.test.js
│   │   ├── asyncHandler.test.js
│   │   └── cacheHelper.test.js
│   ├── middleware/                   # Middleware tests
│   │   ├── auth.test.js
│   │   ├── rateLimiter.test.js
│   │   └── validator.test.js
│   └── validators/                   # Validator tests
│       └── auth.validators.test.js
├── integration/                      # Integration tests
│   ├── controllers/                  # Controller tests
│   │   └── healthcheck.test.js
│   └── api/                          # API endpoint tests
│       ├── auth.test.js
│       ├── songs.test.js
│       └── routes.test.js
└── README.md                         # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- tests/unit/utils/apiError.test.js
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="auth"
```

## Test Categories

### Unit Tests
- **Utils**: Test utility functions in isolation
- **Middleware**: Test middleware functions with mocked dependencies
- **Validators**: Test Zod validation schemas

### Integration Tests
- **Controllers**: Test controller functions with mocked services
- **API**: Test full HTTP request/response cycle

## Test Coverage Goals

- Unit Tests: >80% coverage
- Integration Tests: >70% coverage
- Overall: >75% coverage

## Writing New Tests

### Unit Test Example
```javascript
import { functionToTest } from '../../../src/path/to/module.js';

describe('functionToTest', () => {
  it('should do something', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example
```javascript
import request from 'supertest';
import app from '../../../src/app.js';

describe('API Endpoint', () => {
  it('should return 200', async () => {
    const response = await request(app)
      .get('/api/v1/endpoint')
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

## Mocking

- Database connections are mocked in unit tests
- External services (Supabase, Redis, R2) are mocked
- Use `jest.mock()` for module-level mocks
- Use `jest.fn()` for function mocks

## Test Data

- Use factories for creating test data
- Clean up test data after each test
- Use unique identifiers to avoid conflicts

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Test names should describe what they test
3. **One Assertion**: Prefer one assertion per test when possible
4. **Isolation**: Tests should not depend on each other
5. **Fast**: Unit tests should be fast (<100ms each)
6. **Deterministic**: Tests should produce consistent results

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main/develop branches
- Before deployment

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check import paths are correct

### Tests timing out
- Increase timeout in `jest.config.json`
- Check for hanging promises or unclosed connections

### Mock not working
- Ensure mock is defined before import
- Check mock path matches actual module path

