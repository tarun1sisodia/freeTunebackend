# Database Setup Guide

## Supabase Setup

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Wait for the database to be provisioned

### 2. Run Migrations

#### Option A: Using Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Copy content from `migrations/001_initial_schema.sql`
3. Run the SQL

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. Get API Credentials
1. Go to Project Settings > API
2. Copy:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Update .env File
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Upstash Redis Setup

1. Go to https://upstash.com
2. Create a new Redis database
3. Copy the connection URL
4. Add to .env:
```env
REDIS_URL=your_redis_url
```

---

## MongoDB Atlas Setup

1. Go to https://mongodb.com/cloud/atlas
2. Create a free cluster (M0)
3. Create database user
4. Whitelist IP (0.0.0.0/0 for development)
5. Get connection string
6. Add to .env:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=freetune_analytics
```

---

## Cloudflare R2 Setup

1. Go to Cloudflare Dashboard
2. Navigate to R2 Object Storage
3. Create new bucket: `freetune-audio`
4. Generate API tokens
5. Add to .env:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=freetune-audio
```

---

## Verify Connection

Run the test script:
```bash
npm run test:connections
```

This will verify all database connections are working.
