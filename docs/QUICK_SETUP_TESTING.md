# Quick Setup Guide - FreeTune Backend Testing

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd freeTuneBackend
npm install
```

### Step 2: Create Test Environment File
```bash
cp .env.example .env.test
```

### Step 3: Configure `.env.test`

Edit `.env.test` with your test credentials:

```bash
# CRITICAL: Use separate test instances to avoid data corruption!

NODE_ENV=test

# Supabase Test Instance
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_key

# Redis Test Instance (Upstash free tier or local)
REDIS_URL=https://your-test-redis.upstash.io
REDIS_TOKEN=your_test_redis_token

# MongoDB Test Instance (Atlas free tier)
MONGODB_URI=mongodb+srv://test:password@test-cluster.mongodb.net/
MONGODB_DB_NAME=freeTune_test

# Cloudflare R2 Test Bucket
R2_ACCOUNT_ID=your_test_account
R2_ACCESS_KEY_ID=your_test_key
R2_SECRET_ACCESS_KEY=your_test_secret
R2_BUCKET_NAME=freetune-test

# JWT Test Secret (can be anything for tests)
JWT_SECRET=test_secret_key_12345
JWT_EXPIRES_IN=1h

PORT=3001
```

### Step 4: Run Tests
```bash
# Run all tests
npm test

# Or use the test runner
./run-tests.sh
```

---

## 🔑 Getting Test Credentials

### Supabase Test Database

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name it "freetune-test"
4. Wait for provisioning
5. Go to Settings → API
6. Copy `URL`, `anon key`, and `service_role key`
7. Go to SQL Editor and run the migrations:
   ```sql
   -- Copy content from src/database/migrations/001_initial_schema.sql
   -- Run in SQL Editor
   ```

### Redis Test Cache (Upstash)

1. Go to https://console.upstash.com/
2. Click "Create Database"
3. Choose free tier
4. Name it "freetune-test"
5. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

**Alternative**: Use local Redis
```bash
# Install Redis locally
docker run -d -p 6379:6379 redis:7-alpine

# In .env.test
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=  # Leave empty for local Redis
```

### MongoDB Test Database (Atlas)

1. Go to https://cloud.mongodb.com/
2. Create free cluster
3. Go to Database Access → Add Database User
4. Go to Network Access → Add IP Address (0.0.0.0/0 for testing)
5. Click "Connect" → "Connect your application"
6. Copy connection string
7. Replace `<password>` with your password

### Cloudflare R2 Test Bucket

1. Log in to Cloudflare Dashboard
2. Go to R2 → Create bucket
3. Name it "freetune-test"
4. Go to R2 → Manage R2 API Tokens
5. Create API token with read/write permissions
6. Copy Account ID, Access Key ID, and Secret Access Key

---

## 🧪 Running Specific Tests

```bash
# Database connectivity tests
npm test -- tests/integration/database/

# Individual database tests
npm test -- tests/integration/database/supabase.test.js
npm test -- tests/integration/database/redis.test.js
npm test -- tests/integration/database/mongodb.test.js
npm test -- tests/integration/database/schema.test.js

# Unit tests
npm test -- tests/unit/

# API tests
npm test -- tests/integration/api/

# With coverage
npm test -- --coverage
```

---

## ✅ Verify Setup

Run this to verify everything is configured:

```bash
# Run database connection tests
npm test -- tests/integration/database/ --verbose
```

**Expected Output**:
```
PASS tests/integration/database/supabase.test.js
PASS tests/integration/database/redis.test.js
PASS tests/integration/database/mongodb.test.js
PASS tests/integration/database/schema.test.js

Test Suites: 4 passed, 4 total
Tests: 131+ passed, 131+ total
```

---

## 🚨 Common Setup Issues

### Issue: "Supabase configuration missing"
**Solution**: Check `.env.test` has valid `SUPABASE_URL` and keys

### Issue: "Redis URL/Token not configured"
**Solution**: Add Redis credentials or comment out Redis tests

### Issue: "MongoDB connection error"
**Solution**: 
- Verify connection string
- Check IP whitelist (0.0.0.0/0 for all)
- Verify database user credentials

### Issue: "Cannot find module"
**Solution**: Run `npm install`

### Issue: Tests pass but services don't work
**Solution**: Using test credentials instead of production `.env`

---

## 📋 Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env.test` file created
- [ ] Supabase test project created and configured
- [ ] Redis test instance configured
- [ ] MongoDB test database created
- [ ] R2 test bucket created
- [ ] Database migrations run on test Supabase
- [ ] Tests run successfully (`npm test`)

---

## 🎯 Quick Start Commands

```bash
# 1. Setup
npm install
cp .env.example .env.test
# Edit .env.test with test credentials

# 2. Run tests
npm test

# 3. View coverage
npm test -- --coverage
open coverage/index.html

# 4. Run specific suite
npm test -- tests/integration/database/supabase.test.js

# 5. Watch mode (for development)
npm run test:watch
```

---

## 📖 Next Steps

1. ✅ Complete this setup
2. 📖 Read `TESTING_DOCUMENTATION.md` for detailed guide
3. 🚀 Read `TESTING_ROADMAP.md` for implementation plan
4. 💻 Start implementing Priority 1 tests (see roadmap)
5. 📊 Monitor coverage with `npm test -- --coverage`

---

## 🆘 Need Help?

1. **Documentation**: Check `TESTING_DOCUMENTATION.md`
2. **Quick Reference**: See `TEST_QUICK_REFERENCE.md`
3. **Roadmap**: Review `TESTING_ROADMAP.md`
4. **Examples**: Look at existing test files in `tests/integration/database/`

---

**Setup Time**: ~10-15 minutes (including service signup)  
**Test Execution Time**: ~30 seconds  
**Ready to Test**: ✅ After completing checklist

Good luck! 🚀
