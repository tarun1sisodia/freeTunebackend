# 🚀 FreeTune Backend - Complete Setup Guide

## Prerequisites Checklist

Before starting, ensure you have:
- ✅ Node.js 20+ LTS installed
- ✅ npm 10+ installed
- ✅ Git installed
- ✅ Code editor (VS Code recommended)

---

## Step 1: Services Setup (DO THIS FIRST!)

### 1.1 Supabase Setup ⚡
**Time: 5 minutes**

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project:
   - Choose a name: `freetune`
   - Choose a database password (save it!)
   - Choose region (closest to you)
4. Wait for project to be created (~2 minutes)
5. Go to **Settings** → **API**
6. Copy these values:
   ```
   Project URL → Save as SUPABASE_URL
   anon/public key → Save as SUPABASE_ANON_KEY
   service_role key → Save as SUPABASE_SERVICE_ROLE_KEY
   ```

### 1.2 Cloudflare R2 Setup 📦
**Time: 10 minutes**

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up/Login
3. Navigate to **R2 Object Storage** (left sidebar)
4. Click "Create bucket"
   - Name: `freetune-audio`
   - Location: Automatic
5. Click "Manage R2 API Tokens"
6. Create API token:
   - Name: `freetune-backend`
   - Permissions: Object Read & Write
7. Copy:
   ```
   Account ID → Save as R2_ACCOUNT_ID
   Access Key ID → Save as R2_ACCESS_KEY_ID
   Secret Access Key → Save as R2_SECRET_ACCESS_KEY
   ```

### 1.3 Upstash Redis Setup 🔥
**Time: 3 minutes**

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up with GitHub
3. Click "Create Database"
   - Name: `freetune-cache`
   - Type: Regional
   - Region: Choose closest
4. Click on database
5. Copy:
   ```
   REST URL → Save as REDIS_URL
   REST Token → Save as REDIS_TOKEN
   ```

### 1.4 MongoDB Atlas Setup 🍃
**Time: 5 minutes**

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up / Login
3. Create a free cluster:
   - Cloud Provider: AWS
   - Region: Choose closest
   - Cluster Tier: M0 (Free)
   - Cluster Name: `FreeTune`
4. Create Database User:
   - Username: `freetune`
   - Password: Generate & save it
5. Network Access:
   - Add IP: `0.0.0.0/0` (Allow from anywhere for now)
6. Connect:
   - Choose "Connect your application"
   - Driver: Node.js
   - Copy connection string → Save as MONGODB_URI
   - Replace `<password>` with your password

### 1.5 External APIs (Optional - Can Skip for Now)

#### Spotify API
1. Go to [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy Client ID and Client Secret

#### Last.fm API
1. Go to [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create)
2. Create API account
3. Copy API Key

#### Genius API
1. Go to [https://genius.com/api-clients](https://genius.com/api-clients)
2. Create API Client
3. Copy Access Token

---

## Step 2: Project Setup

### 2.1 Install Dependencies

```bash
npm install
```

### 2.2 Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your actual credentials
nano .env  # or use your preferred editor
```

**Fill in these REQUIRED values:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key

REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token

MONGODB_URI=your_mongodb_uri

JWT_SECRET=generate_a_random_secret_here
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.3 Setup Database

```bash
# Run Supabase migrations
# Go to Supabase Dashboard → SQL Editor
# Copy and run: src/database/migrations/001_initial_schema.sql
```

---

## Step 3: Run Development Server

```bash
# Start dev server
npm run dev

# Server should start on http://localhost:3000
```

**Test it:**
```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "success": true,
  "message": "Server is running",
  "environment": "development"
}
```

---

## Step 4: Git Setup

```bash
# Initialize git (already done)
git status

# Create develop branch
git checkout -b develop

# Add all files
git add .

# Initial commit
git commit -m "feat: initial backend setup with industry-standard structure"

# Push to remote (if you have a GitHub repo)
git remote add origin https://github.com/yourusername/freetune-backend.git
git push -u origin main
git push -u origin develop
```

---

## Step 5: Deploy to Vercel

### 5.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 5.2 Login

```bash
vercel login
```

### 5.3 Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 5.4 Add Environment Variables

In Vercel Dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add all variables from your .env file

---

## Step 6: Verify Everything Works

### 6.1 Check Health
```bash
curl https://your-vercel-domain.vercel.app/health
```

### 6.2 Check API
```bash
curl https://your-vercel-domain.vercel.app/api
```

---

## 🎯 Next Steps

1. **Create your first feature branch:**
   ```bash
   git checkout develop
   git checkout -b feature/song-api
   ```

2. **Start building endpoints:**
   - Song streaming API
   - User authentication
   - Search functionality
   - Recommendations engine

3. **Read documentation:**
   - `docs/API.md` - API endpoints reference
   - `docs/DATABASE_SETUP.md` - Database details
   - `docs/GIT_WORKFLOW.md` - Git best practices

---

## 📦 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Business logic (TO BE CREATED)
│   ├── middleware/       # Express middleware ✅
│   ├── models/           # Data models (TO BE CREATED)
│   ├── routes/           # API routes (TO BE CREATED)
│   ├── services/         # External services (TO BE CREATED)
│   ├── utils/            # Helpers ✅
│   ├── validators/       # Validation schemas (TO BE CREATED)
│   └── database/         # DB connections ✅
├── api/                  # Vercel functions (TO BE CREATED)
├── workers/              # Background jobs (TO BE CREATED)
├── tests/                # Tests (TO BE CREATED)
└── docs/                 # Documentation ✅
```

---

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### MongoDB connection error
- Check if IP is whitelisted (0.0.0.0/0)
- Verify password in connection string
- Check network connection

### Redis connection error
- Verify REDIS_URL is correct
- Check Upstash dashboard for status

### Supabase error
- Check if project is active
- Verify API keys are correct
- Check Supabase dashboard logs

---

## 🎉 Success Checklist

- [ ] All services created and configured
- [ ] Dependencies installed
- [ ] .env file configured
- [ ] Database migrations run
- [ ] Dev server running
- [ ] Health check passing
- [ ] Git initialized
- [ ] Deployed to Vercel (optional for now)

---

## 📞 Need Help?

Check these resources:
- [Supabase Docs](https://supabase.com/docs)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Upstash Docs](https://docs.upstash.com/)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [Vercel Docs](https://vercel.com/docs)

---

**You're all set! Start building your music streaming app! 🎵**
