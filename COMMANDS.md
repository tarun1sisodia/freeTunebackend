# 🚀 Quick Command Reference

## Server Commands

```bash
# Start development server
npm start

# Test all connections
node scripts/test-connections.js

# Check server health
curl http://localhost:3000/health

# Test API info
curl http://localhost:3000/api
```

## Port Management

```bash
# Check what's running on port 3000
lsof -ti:3000

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find server process
ps aux | grep "node src/index.js"
```

## Git Workflow

```bash
# Check current status
git status

# See all branches
git branch -a

# Create new feature branch
git checkout develop
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature-name
```

## Testing

```bash
# Test connections
node scripts/test-connections.js

# Run Jest tests (when you create them)
npm test

# Run with coverage
npm run test -- --coverage
```

## Logs

```bash
# View all logs
cat logs/all.log

# View error logs only
cat logs/error.log

# Follow logs in real-time
tail -f logs/all.log

# View last 50 lines
tail -50 logs/all.log
```

## Database

```bash
# Your Supabase dashboard
# https://app.supabase.com

# Your Upstash Redis dashboard
# https://console.upstash.com

# Your MongoDB Atlas dashboard
# https://cloud.mongodb.com
```

## Useful Checks

```bash
# Check Node version
node --version

# Check npm version
npm --version

# List installed packages
npm list --depth=0

# Check for outdated packages
npm outdated

# Update a package
npm update package-name
```

## Environment

```bash
# Edit environment variables
nano .env

# Check if env vars are loaded
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"

# Copy env template
cp .env.example .env
```

## Development Workflow

```bash
# 1. Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. Make changes and test
npm start
curl http://localhost:3000/health

# 3. Commit your work
git add .
git commit -m "feat: add new feature"

# 4. Push to remote
git push origin feature/new-feature

# 5. Create Pull Request on GitHub
# 6. After merge, delete branch
git checkout develop
git pull origin develop
git branch -d feature/new-feature
```

## Troubleshooting

```bash
# Server won't start - check port
lsof -ti:3000 | xargs kill -9

# Connection issues - test
node scripts/test-connections.js

# Module not found - reinstall
rm -rf node_modules package-lock.json
npm install

# Check for errors
cat logs/error.log | tail -50

# Restart server cleanly
lsof -ti:3000 | xargs kill -9
npm start
```

## Quick References

| Task | Command |
|------|---------|
| Start server | `npm start` |
| Test connections | `node scripts/test-connections.js` |
| View logs | `tail -f logs/all.log` |
| Kill server | `lsof -ti:3000 \| xargs kill -9` |
| New feature | `git checkout -b feature/name` |
| Commit | `git commit -m "feat: message"` |

---

**Need more help?** Check these files:
- `TODO.md` - Development roadmap
- `SUMMARY.md` - What's built and what's next
- `docs/GIT_WORKFLOW.md` - Detailed Git guide
- `docs/API.md` - API documentation

