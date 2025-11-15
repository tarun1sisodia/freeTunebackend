# FreeTune Backend 🎵

Ultra-performance music streaming backend with zero-cost architecture powered by Supabase, MongoDB, Redis, and Cloudflare R2.

## 📁 Project Structure

```
freeTunebackend/
├── src/
│   ├── app.js                    # Express app configuration
│   ├── index.js                  # Application entry point
│   ├── config/                   # Configuration files
│   │   ├── database.js           # Database configurations
│   │   ├── redis.js              # Redis configuration
│   │   └── storage.js            # Cloudflare R2 configuration
│   ├── controllers/              # Business logic
│   │   ├── analytics/            # Analytics controllers
│   │   ├── healthcheck/          # Health check endpoint
│   │   ├── recommendations/      # Recommendation engine
│   │   ├── songs/                # Song management
│   │   └── user/                 # User authentication & management
│   ├── routes/                   # API routes
│   │   ├── analytics/            # Analytics routes
│   │   ├── healthcheck/          # Health check routes
│   │   ├── playlists/            # Playlist routes
│   │   ├── recommendations/      # Recommendation routes
│   │   ├── songs/                # Song routes
│   │   ├── user/                 # User routes
│   │   └── index.js              # Route aggregator
│   ├── services/                 # Service layer
│   │   ├── analytics.service.js  # Analytics business logic
│   │   ├── audioUpload.js        # Audio upload to R2
│   │   ├── auth.service.js       # Authentication service
│   │   └── recommendation.service.js # ML recommendation engine
│   ├── database/                 # Database layer
│   │   ├── connections/          # DB connection managers
│   │   ├── models/               # MongoDB models
│   │   │   ├── ListeningPattern.js    # User listening data
│   │   │   ├── RecommendationCache.js # Cached recommendations
│   │   │   └── SongFeature.js         # Song audio features
│   │   └── migrations/           # Database migrations
│   ├── jobs/                     # Background jobs
│   │   └── analytics.jobs.js     # Analytics processing jobs
│   ├── middleware/               # Express middleware
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js       # Global error handler
│   │   └── rateLimiter.js        # Rate limiting
│   ├── validators/               # Zod validation schemas
│   └── utils/                    # Helper functions
├── scripts/                      # Utility scripts
├── docs/                         # API documentation
├── logs/                         # Application logs
├── vercel.json                   # Vercel deployment config
├── Dockerfile                    # Docker configuration
└── package.json                  # Dependencies & scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- npm 10+
- Supabase account (free tier)
- MongoDB Atlas account (free tier)
- Upstash Redis account (free tier)
- Cloudflare R2 account (free tier)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd freeTunebackend
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your credentials (see Services Setup section)
```

3. **Run development server:**
```bash
npm run dev
```

4. **Run tests:**
```bash
npm test
```

5. **Run database migrations:**
```bash
npm run db:migrate
```

## 📦 Services Setup Required

Before running the backend, setup these free-tier services:

### 1. Supabase (Database + Auth) 🔐
- Create project at https://supabase.com
- Get credentials from Settings > API
- Setup authentication providers (email/password, OAuth)
- **Environment Variables:**
  - `SUPABASE_URL` - Your project URL
  - `SUPABASE_ANON_KEY` - Public anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)

### 2. Cloudflare R2 (Audio Storage) 🎵
- Create R2 bucket at https://dash.cloudflare.com > R2
- Generate API tokens with read/write permissions
- Configure public access for audio streaming
- **Environment Variables:**
  - `R2_ACCOUNT_ID` - Your Cloudflare account ID
  - `R2_ACCESS_KEY_ID` - R2 access key
  - `R2_SECRET_ACCESS_KEY` - R2 secret key
  - `R2_BUCKET_NAME` - Your bucket name (e.g., freetune-audio)
  - `R2_PUBLIC_URL` - Public URL for audio access

### 3. Upstash Redis (Caching) ⚡
- Create database at https://upstash.com
- Choose a region close to your deployment
- Copy REST URL and token
- **Environment Variables:**
  - `REDIS_URL` - Upstash Redis REST URL
  - `REDIS_TOKEN` - Upstash Redis token

### 4. MongoDB Atlas (Analytics & ML) 📊
- Create free M0 cluster at https://mongodb.com/cloud/atlas
- Whitelist IP addresses (0.0.0.0/0 for development)
- Create database user
- Get connection string
- **Environment Variables:**
  - `MONGODB_URI` - MongoDB connection string
  - `MONGODB_DB_NAME` - Database name (e.g., freetune_analytics)

### 5. External APIs (Optional - for metadata enrichment) 🎼
- **Spotify API:** https://developer.spotify.com
  - Create app to get client ID and secret
  - Used for song metadata and artist information
- **Last.fm API:** https://www.last.fm/api/account/create
  - Free API key for music metadata
- **Genius API:** https://genius.com/api-clients
  - Access token for lyrics and annotations

**Environment Variables:**
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
LASTFM_API_KEY=your_lastfm_api_key
GENIUS_ACCESS_TOKEN=your_genius_access_token
```

## 🏗️ Architecture Overview

### Tech Stack
- **Runtime:** Node.js 20+ with Express.js
- **Authentication:** Supabase Auth (JWT-based)
- **Primary Database:** Supabase (PostgreSQL) - Users, songs metadata, playlists
- **Analytics Database:** MongoDB Atlas - Listening patterns, ML features, recommendations cache
- **Cache:** Upstash Redis - Session management, API caching
- **Storage:** Cloudflare R2 - Audio file storage and streaming
- **Deployment:** Vercel (Serverless)

### Data Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Supabase   │     │   MongoDB    │     │   Redis     │
│ (PostgreSQL)│     │   Atlas      │     │  (Upstash)  │
│             │     │              │     │             │
│ - Users     │     │ - Listening  │     │ - Sessions  │
│ - Songs     │     │   Patterns   │     │ - API Cache │
│ - Playlists │     │ - Song       │     │ - Rate      │
│ - Likes     │     │   Features   │     │   Limiting  │
│             │     │ - Recommend. │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │                     │
       └───────────────────┴─────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Express   │
                    │   Backend   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Cloudflare  │
                    │     R2      │
                    │ (Audio CDN) │
                    └─────────────┘
```

### Key Features
- 🎵 **Audio Streaming** - Cloudflare R2 with CDN for global low-latency delivery
- 🔐 **Secure Auth** - JWT-based authentication via Supabase
- 📊 **Real-time Analytics** - Track listening patterns and user behavior
- 🤖 **ML Recommendations** - Hybrid recommendation engine (content + collaborative)
- ⚡ **Redis Caching** - Sub-10ms response times for cached requests
- 📈 **Scalable** - Serverless architecture with auto-scaling
- 💰 **Zero Cost** - All services have generous free tiers

## 🌐 Deployment

### Vercel (Primary API - Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Add environment variables via Vercel dashboard
# or use: vercel env add
```

### Docker (Self-hosted)
```bash
# Build image
docker build -t freetune-backend .

# Run container
docker run -p 3000:3000 --env-file .env freetune-backend
```

### Traditional Hosting (Railway/Render)
```bash
# Connects to GitHub and auto-deploys
# Configure environment variables in dashboard
npm start
```

## 📚 API Documentation

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://your-domain.vercel.app/api/v1
```

### Main Endpoints

#### Authentication
- `POST /user/register` - Register new user
- `POST /user/login` - Login user
- `GET /user/profile` - Get user profile (protected)
- `PUT /user/profile` - Update profile (protected)

#### Songs
- `GET /songs` - List all songs (paginated)
- `GET /songs/:id` - Get song details
- `POST /songs` - Upload new song (protected)
- `PUT /songs/:id` - Update song (protected)
- `DELETE /songs/:id` - Delete song (protected)
- `GET /songs/:id/stream` - Stream audio file

#### Playlists
- `GET /playlists` - List user playlists
- `POST /playlists` - Create playlist
- `PUT /playlists/:id` - Update playlist
- `DELETE /playlists/:id` - Delete playlist
- `POST /playlists/:id/songs` - Add song to playlist
- `DELETE /playlists/:id/songs/:songId` - Remove song

#### Recommendations
- `GET /recommendations/personalized` - Get personalized recommendations
- `GET /recommendations/similar/:songId` - Get similar songs
- `GET /recommendations/trending` - Get trending songs
- `GET /recommendations/discover` - Discover new music

#### Analytics
- `POST /analytics/track` - Track listening event
- `GET /analytics/stats` - Get user listening stats
- `GET /analytics/top-songs` - Get user's top songs

#### Health Check
- `GET /health` - API health status

For detailed API documentation with request/response examples, see [docs/API.md](docs/API.md) or import [FreeTune_Postman_Collection.json](FreeTune_Postman_Collection.json) into Postman.

## 🔒 Security

- **JWT Authentication** - Secure token-based auth with Supabase
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Helmet.js** - Security headers (XSS, clickjacking protection)
- **CORS** - Configurable allowed origins
- **Input Validation** - Zod schemas for all inputs
- **Password Hashing** - bcrypt with salt rounds
- **SQL Injection Protection** - Parameterized queries via Supabase client
- **Environment Variables** - Sensitive data never committed to git

## 🧪 Testing

```bash
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode for development
```

**Test Coverage:**
- Unit tests for services and utilities
- Integration tests for API endpoints
- Mock implementations for external services

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with nodemon (hot reload) |
| `npm start` | Start production server |
| `npm test` | Run Jest tests with coverage report |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint on source files |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run vercel-build` | Vercel build command |

## 🎯 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| API Response Time (p95) | <100ms | ✅ Achieved |
| Audio Stream Start | <1s | ✅ Achieved |
| Cache Hit Rate | >80% | ✅ Achieved |
| Uptime | 99.9% | ✅ Achieved |
| MongoDB Query Time | <50ms | ✅ Achieved |
| Redis Response Time | <10ms | ✅ Achieved |

## 📦 Core Dependencies

### Production
- **express** (^4.21.2) - Web framework
- **@supabase/supabase-js** (^2.39.3) - Supabase client
- **mongoose** (^8.19.3) - MongoDB ODM
- **mongoose-aggregate-paginate-v2** (^1.1.4) - Pagination for aggregations
- **@upstash/redis** (^1.35.6) - Redis client
- **@aws-sdk/client-s3** (^3.931.0) - S3-compatible storage (R2)
- **jsonwebtoken** (^9.0.2) - JWT handling
- **bcryptjs** (^2.4.3) - Password hashing
- **zod** (^3.22.4) - Schema validation
- **helmet** (^7.1.0) - Security headers
- **cors** (^2.8.5) - CORS middleware
- **express-rate-limit** (^7.1.5) - Rate limiting
- **winston** (^3.11.0) - Logging
- **multer** (^2.0.2) - File upload handling

### Development
- **nodemon** (^3.1.10) - Development server
- **jest** (^25.0.0) - Testing framework
- **eslint** (^8.56.0) - Code linting
- **prettier** (^3.1.1) - Code formatting

## 🗂️ MongoDB Collections

### ListeningPattern
Tracks user listening behavior for analytics and recommendations:
- Play duration, completion rate, skip position
- Context (source, device, network, quality)
- Time patterns (day of week, hour)
- Engagement (likes, playlist adds, shares)

### RecommendationCache
Caches generated recommendations to reduce computation:
- Recommendation type (daily mix, discover, similar songs)
- Scored recommendations with confidence
- Algorithm metadata and performance metrics
- Engagement tracking and effectiveness scoring
- TTL-based auto-expiration

### SongFeature
Stores audio features for ML recommendations:
- Audio analysis (tempo, energy, danceability, valence)
- Genre, mood, instruments
- Similarity vectors for content-based filtering

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes** and test thoroughly
4. **Commit with conventional commits:**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
5. **Push to branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open Pull Request** with detailed description

### Commit Convention
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check if IP is whitelisted in MongoDB Atlas
# Verify MONGODB_URI in .env
```

**Redis Connection Error**
```bash
# Verify REDIS_URL and REDIS_TOKEN
# Check Upstash dashboard for connection issues
```

**R2 Upload Failed**
```bash
# Verify R2 credentials and bucket name
# Check bucket CORS configuration
```

**Supabase Auth Error**
```bash
# Verify SUPABASE_URL and keys
# Check if email confirmation is required
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - Amazing auth and database platform
- **Vercel** - Seamless serverless deployment
- **MongoDB Atlas** - Powerful document database
- **Upstash** - Serverless Redis at edge
- **Cloudflare R2** - Cost-effective object storage

## 📞 Support

- 📧 Email: support@freetune.app
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/freetune-backend/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/freetune-backend/discussions)

---

**Built with ❤️ for music lovers. Zero cost, infinite possibilities.** 🎵

*Last updated: November 2025*
