# ---------- 1. Base for dependencies ----------
    FROM node:20-alpine AS deps

    WORKDIR /app
    
    # Only copy package.json and lock for layer caching
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # ---------- 2. Builder for development (optional) ----------
    FROM node:20-alpine AS dev
    
    WORKDIR /app
    
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    # Install dev dependencies for development only
    RUN npm install
    
    USER node
    
    CMD ["npm", "run", "dev"]
    
    # ---------- 3. Production Stage ----------
    FROM node:20-alpine AS runner
    
    WORKDIR /app
    
    # Run as non-root user for security
    RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
    USER appuser
    
    # Copy production node_modules and all files
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    # (Optional) Don't include tests/docs in the image
    RUN rm -rf tests docs .github
    
    EXPOSE 3000
    
    HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
      CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
    
    ENV NODE_ENV=production
    
    # Allow using SIGTERM for safe shutdown
    STOPSIGNAL SIGTERM
    
    CMD ["npm", "start"]
    
    # -------- Build notes --------
    # For prod:   docker build -t freetune-backend .
    # For dev:    docker build --target dev -t freetune-backend-dev .
    # Run:        docker run --env-file .env -p 3000:3000 freetune-backend