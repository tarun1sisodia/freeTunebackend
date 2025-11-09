# FreeTune Backend 🎵

Ultra-performance music streaming backend with zero-cost architecture.

## 📁 Project Structure

```
backend/
├── api/                    # Vercel serverless functions
│   ├── songs/             # Song-related endpoints
│   ├── user/              # User management
│   ├── recommendations/   # Recommendation engine
│   └── health.js          # Health check
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # Business logic
│   ├── middleware/        # Express middleware
│   ├── models/            # Data models
│   ├── routes/            # Express routes
│   ├── services/          # External service integrations
│   ├── utils/             # Helper functions
│   ├── validators/        # Zod validation schemas
│   └── database/          # Database connections & migrations
├── workers/               # Background workers (Railway/Render)
├── tests/                 # Jest tests
├── docs/                  # API documentation
└── scripts/               # Utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- npm 10+

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Run development server:**
```bash
npm run dev
```

4. **Run tests:**
```bash
npm test
```

## 📦 Services Setup Required

Before running the backend, setup these services:

### 1. Supabase (Database + Auth)
- Create project at https://supabase.com
- Get credentials from Settings > API
- Add to `.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 2. Cloudflare R2 (Audio Storage)
- Create R2 bucket at https://dash.cloudflare.com
- Generate API tokens
- Add to `.env`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

### 3. Upstash Redis (Caching)
- Create database at https://upstash.com
- Copy connection URL
- Add to `.env`: `REDIS_URL`, `REDIS_TOKEN`

### 4. MongoDB Atlas (Analytics)
- Create free cluster at https://mongodb.com
- Get connection string
- Add to `.env`: `MONGODB_URI`

### 5. External APIs (Optional)
- Spotify API: https://developer.spotify.com
- Last.fm API: https://www.last.fm/api
- Genius API: https://genius.com/api-clients

## 🌐 Deployment

### Vercel (Primary API)
```bash
vercel deploy
```

### Railway (Workers)
```bash
railway up
```

## 📚 API Documentation

See [docs/API.md](docs/API.md) for complete API reference.

## 🔒 Security

- JWT authentication
- Rate limiting enabled
- Helmet.js security headers
- CORS configured
- Input validation with Zod

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## 📄 License

MIT

## 🎯 Performance Targets

- API Response: <100ms (p95)
- Audio Stream Start: <1s
- Cache Hit Rate: >80%
- Uptime: 99.9%

---

Built with ❤️ for personal use. Zero cost, infinite possibilities.
