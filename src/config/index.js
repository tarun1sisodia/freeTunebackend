import dotenv from 'dotenv';
import {
  AUDIO_BITRATES,
  AUDIO_QUALITIES,
  ENVIRONMENTS,
} from '../utils/constants.js';

dotenv.config();

const config = {
  // Server
  env: process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT,
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Cloudflare R2
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME || 'music',
    publicUrl: process.env.R2_PUBLIC_URL,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'freeTune',
  },

  // Mongoose
  mongoose: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'freeTune',
  },

  // External APIs
  external: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    lastfm: {
      apiKey: process.env.LASTFM_API_KEY,
    },
    genius: {
      accessToken: process.env.GENIUS_ACCESS_TOKEN,
    },
  },

  // CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8080',
    ],
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Cache TTL (in seconds)
  cache: {
    hotSongs: 3600, // 1 hour
    userRecent: 604800, // 7 days
    trending: 3600, // 1 hour
    cdnUrls: 1800, // 30 minutes
  },

  // Audio Quality Settings
  audio: {
    qualities: [
      AUDIO_QUALITIES.ORIGINAL,
      AUDIO_QUALITIES.HIGH,
      AUDIO_QUALITIES.MEDIUM,
      AUDIO_QUALITIES.LOW,
      AUDIO_QUALITIES.PREVIEW,
    ],
    bitrates: {
      [AUDIO_QUALITIES.HIGH]: AUDIO_BITRATES[AUDIO_QUALITIES.HIGH],
      [AUDIO_QUALITIES.MEDIUM]: AUDIO_BITRATES[AUDIO_QUALITIES.MEDIUM],
      [AUDIO_QUALITIES.LOW]: AUDIO_BITRATES[AUDIO_QUALITIES.LOW],
    },
  },
};

// Validation
const validateConfig = () => {
  const required = {
    SUPABASE_URL: config.supabase.url,
    SUPABASE_ANON_KEY: config.supabase.anonKey,
    JWT_SECRET: config.jwt.secret,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0 && config.env === ENVIRONMENTS.PRODUCTION) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
};

validateConfig();

export default config;
