# ---- Base Stage ----
# Use a specific Node.js version for reproducibility.
# Alpine Linux is used for its small size.
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies Stage ----
# Install dependencies first to leverage Docker layer caching.
FROM base AS dependencies
COPY package.json package-lock.json ./
# Use 'npm ci' for deterministic builds in CI/CD environments.
# --only=production ensures we don't install devDependencies.
RUN npm ci --only=production

# ---- Build Stage ----
# Copy source code and build the application if necessary.
# In this case, since it's a Node.js app without a build step,
# we just copy the code.
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# ---- Production Stage ----
# Final, lean image for production.
FROM base AS production
# Set NODE_ENV to production
ENV NODE_ENV=production
# Copy only necessary files from the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./

# The application listens on port 3000 by default.
EXPOSE 3000

# The command to start the application.
CMD ["node", "src/index.js"]
