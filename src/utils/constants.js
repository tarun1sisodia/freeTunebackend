/**
 * Application-wide constants
 * Following MEMO.md specifications
 *
 * NOTE: This file is the single source of truth for shared constants across
 * the entire backend codebase. Any new constant needed by core files like
 * apiError.js, apiResponse.js, errorHandler.js, logger.js, cacheHelper.js,
 * fileUpload.js or future modules must be defined here.
 *
 * To extend: Simply append new keys under a suitable section or add a new
 * section header to maintain organization. Do NOT define constants scattered
 * in each util - import from here instead!
 */

// ============================================================================
// AUDIO QUALITY SETTINGS
// ============================================================================
const AUDIO_QUALITIES = {
  ORIGINAL: "original",
  HIGH: "high", // 320kbps
  MEDIUM: "medium", // 128kbps
  LOW: "low", // 64kbps
  PREVIEW: "preview", // 30s clips
};

const AUDIO_BITRATES = {
  [AUDIO_QUALITIES.HIGH]: 320,
  [AUDIO_QUALITIES.MEDIUM]: 128,
  [AUDIO_QUALITIES.LOW]: 64,
};

const QUALITY_FOLDERS = {
  [AUDIO_QUALITIES.ORIGINAL]: "original/",
  [AUDIO_QUALITIES.HIGH]: "high/",
  [AUDIO_QUALITIES.MEDIUM]: "medium/",
  [AUDIO_QUALITIES.LOW]: "low/",
  [AUDIO_QUALITIES.PREVIEW]: "previews/",
};

// ============================================================================
// CACHE TTL (Time To Live) in seconds
// ============================================================================
const CACHE_TTL = {
  HOT_SONGS: 3600, // 1 hour
  USER_RECENT: 604800, // 7 days
  TRENDING: 3600, // 1 hour
  CDN_URLS: 1800, // 30 minutes
  SEARCH_RESULTS: 1800, // 30 minutes
  RECOMMENDATIONS: 7200, // 2 hours
  USER_PREFERENCES: 86400, // 1 day
  PLAYLIST: 3600, // 1 hour
};

// ============================================================================
// CACHE KEYS
// ============================================================================
const CACHE_KEYS = {
  HOT_SONG: id => `hot:song:${id}`,
  USER_RECENT: userId => `user:recent:${userId}`,
  TRENDING_DAILY: () => "trending:daily",
  CDN_URL: (songId, quality) => `cdn:url:${songId}:${quality}`,
  SEARCH: query => `search:${query.toLowerCase()}`,
  RECOMMENDATIONS: userId => `rec:${userId}`,
  USER_PREF: userId => `pref:${userId}`,
  PLAYLIST: id => `playlist:${id}`,
  // Add new cache patterns here as needed for cacheHelper.js & related
};

// ============================================================================
// USER INTERACTION TYPES
// ============================================================================
const INTERACTION_TYPES = {
  PLAY: "play",
  LIKE: "like",
  SKIP: "skip",
  DOWNLOAD: "download",
  SHARE: "share",
};

// ============================================================================
// PLAYLIST TYPES
// ============================================================================
const PLAYLIST_TYPES = {
  USER_CREATED: "user_created",
  AUTO_GENERATED: "auto_generated",
  FAVORITES: "favorites",
  RECENTLY_PLAYED: "recently_played",
  TOP_TRACKS: "top_tracks",
};

// ============================================================================
// HTTP STATUS CODES (shared by apiError.js, apiResponse.js, errorHandler.js)
// ============================================================================
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ============================================================================
// ERROR CODES & STRING IDS for consistent programmatic error handling
// ============================================================================
const ERROR_CODES = {
  // Standard error codes (extend as needed)
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  // Add custom business error codes here
};

// ============================================================================
// VALIDATION LIMITS
// ============================================================================
const LIMITS = {
  SONG_TITLE_MAX: 255,
  ARTIST_NAME_MAX: 255,
  ALBUM_NAME_MAX: 255,
  PLAYLIST_NAME_MAX: 255,
  PLAYLIST_DESCRIPTION_MAX: 1000,
  GENRE_MAX: 100,
  MAX_SONGS_PER_PLAYLIST: 1000,
  MAX_PLAYLISTS_PER_USER: 100,
  SEARCH_QUERY_MIN: 2,
  SEARCH_QUERY_MAX: 100,
  PAGINATION_MAX_LIMIT: 100,
  PAGINATION_DEFAULT_LIMIT: 20,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  // Add new limits here as needed for uploads, etc.
};

// ============================================================================
// SUPPORTED FILE TYPES (for uploads, fileUpload.js, etc.)
// ============================================================================
const SUPPORTED_AUDIO_FORMATS = [
  "audio/mpeg", // MP3
  "audio/mp3",
  "audio/flac", // FLAC
  "audio/x-flac",
  "audio/wav", // WAV
  "audio/x-wav",
  "audio/aac", // AAC
  "audio/ogg", // OGG
  "audio/webm", // WebM
];

const SUPPORTED_IMAGE_FORMATS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// ============================================================================
// FILE UPLOAD SETTINGS (fileUpload.js)
// ============================================================================
const FILE_UPLOAD_CONFIG = {
  AUDIO_MAX_SIZE: 100 * 1024 * 1024, // 100 MB
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_AUDIO_FORMATS: [...SUPPORTED_AUDIO_FORMATS],
  ALLOWED_IMAGE_FORMATS: [...SUPPORTED_IMAGE_FORMATS],
  // Extend with more as needed
};

// ============================================================================
// RATE LIMITING (can be referenced in errorHandler.js, middleware, etc.)
// ============================================================================
const RATE_LIMITS = {
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
  },
  STREAM: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
  },
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    max: 20,
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
  },
  // Extend with new endpoints/limits as needed
};

// ============================================================================
// ERROR MESSAGES (for apiError.js, apiResponse.js, errorHandler.js)
// ============================================================================
const ERROR_MESSAGES = {
  // Auth
  UNAUTHORIZED: "Authentication required",
  INVALID_CREDENTIALS: "Invalid email or password",
  TOKEN_EXPIRED: "Token has expired",
  TOKEN_INVALID: "Invalid token",

  // Validation
  VALIDATION_FAILED: "Validation failed",
  INVALID_INPUT: "Invalid input provided",
  REQUIRED_FIELD: "This field is required",

  // Resources
  NOT_FOUND: "Resource not found",
  SONG_NOT_FOUND: "Song not found",
  PLAYLIST_NOT_FOUND: "Playlist not found",
  USER_NOT_FOUND: "User not found",

  // Operations
  OPERATION_FAILED: "Operation failed",
  UPLOAD_FAILED: "File upload failed",
  DELETE_FAILED: "Delete operation failed",
  UPDATE_FAILED: "Update operation failed",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later",

  // Server
  INTERNAL_ERROR: "Internal server error",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
  // Extend for new features/modules as required
};

// ============================================================================
// SUCCESS MESSAGES (apiResponse.js, response objects, etc.)
// ============================================================================
const SUCCESS_MESSAGES = {
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  OPERATION_SUCCESS: "Operation completed successfully",

  // Auth
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  REGISTER_SUCCESS: "Registration successful",

  // Songs
  SONG_UPLOADED: "Song uploaded successfully",
  SONG_DELETED: "Song deleted successfully",

  // Playlists
  PLAYLIST_CREATED: "Playlist created successfully",
  PLAYLIST_UPDATED: "Playlist updated successfully",
  PLAYLIST_DELETED: "Playlist deleted successfully",
  SONG_ADDED_TO_PLAYLIST: "Song added to playlist",
  SONG_REMOVED_FROM_PLAYLIST: "Song removed from playlist",
  // Add more domain-specific success messages as features grow
};

// ============================================================================
// CLOUDFLARE R2 CONFIG
// ============================================================================
const R2_CONFIG = {
  SIGNED_URL_EXPIRY: 3600, // 1 hour
  MAX_UPLOAD_SIZE: 100 * 1024 * 1024, // 100MB
  MULTIPART_THRESHOLD: 10 * 1024 * 1024, // 10MB
};

// ============================================================================
// RECOMMENDATION SETTINGS
// ============================================================================
const RECOMMENDATION_CONFIG = {
  MIN_INTERACTIONS: 5, // Minimum interactions before generating recommendations
  MAX_RECOMMENDATIONS: 50,
  DEFAULT_RECOMMENDATIONS: 20,
  SIMILARITY_THRESHOLD: 0.7,
};

// ============================================================================
// SEARCH SETTINGS
// ============================================================================
const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 50,
  DEFAULT_RESULTS: 20,
  FUZZY_MATCH_THRESHOLD: 0.6,
};

// ============================================================================
// TRENDING CALCULATION
// ============================================================================
const TRENDING_CONFIG = {
  TIME_WINDOW_HOURS: 24,
  MIN_PLAYS_REQUIRED: 10,
  PLAY_WEIGHT: 1.0,
  LIKE_WEIGHT: 2.0,
  SHARE_WEIGHT: 3.0,
  SKIP_WEIGHT: -0.5,
};

// ============================================================================
// PAGINATION
// ============================================================================
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// ============================================================================
// REGEX PATTERNS (apiError.js, file validators, etc.)
// ============================================================================
const REGEX = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/i,
  // Add new regex as needed for new validators
};

// ============================================================================
// ENVIRONMENT
// ============================================================================
const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
};

// ============================================================================
// LOG LEVELS (for logger.js and related utils)
// ============================================================================
const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  HTTP: "http",
  DEBUG: "debug",
};

// ============================================================================
// STANDARD API STRUCTURE CONSTANTS (for apiResponse.js, errorHandler.js)
// ============================================================================
const RESPONSE_STRUCTURE = {
  DEFAULT_SUCCESS_MESSAGE: SUCCESS_MESSAGES.OPERATION_SUCCESS,
  DEFAULT_ERROR_MESSAGE: ERROR_MESSAGES.INTERNAL_ERROR,
  DATA_KEY: "data",
  MESSAGE_KEY: "message",
  STATUS_CODE_KEY: "statusCode",
  SUCCESS_KEY: "success",
  TIMESTAMP_KEY: "timestamp",
  ERROR_KEY: "errors",
  CACHE_KEY: "cache",
  // Add more mapping keys as new requirements emerge
};

// ============================================================================
// LOGGER SETTINGS (logger.js, can extend with new log transports)
// ============================================================================
const LOGGER_CONFIG = {
  LOG_TO_CONSOLE: true,
  LOG_TO_FILE: false,
  LOG_FILE_PATH: "logs/app.log",
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_FILES: 3,
  // Additional options for future transports (DB, Cloud, etc.)
};

// ============================================================================
// GENERAL PURPOSE CONSTANTS
// ============================================================================
const YES_NO = {
  YES: "yes",
  NO: "no",
};

const BOOLEAN_INT = {
  TRUE: 1,
  FALSE: 0,
};

// ============================================================================
// EXPORT ALL CONSTANTS IN A CENTRALIZED OBJECT FOR EASY IMPORT
// ============================================================================
export {
  AUDIO_QUALITIES,
  AUDIO_BITRATES,
  QUALITY_FOLDERS,
  CACHE_TTL,
  CACHE_KEYS,
  INTERACTION_TYPES,
  PLAYLIST_TYPES,
  HTTP_STATUS,
  ERROR_CODES,
  LIMITS,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_IMAGE_FORMATS,
  FILE_UPLOAD_CONFIG,
  RATE_LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  R2_CONFIG,
  RECOMMENDATION_CONFIG,
  SEARCH_CONFIG,
  TRENDING_CONFIG,
  PAGINATION,
  REGEX,
  ENVIRONMENTS,
  LOG_LEVELS,
  RESPONSE_STRUCTURE,
  LOGGER_CONFIG,
  YES_NO,
  BOOLEAN_INT,
};
