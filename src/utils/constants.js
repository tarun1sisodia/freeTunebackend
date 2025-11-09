/**
 * Application-wide constants
 * Following MEMO.md specifications
 */

// ============================================================================
// AUDIO QUALITY SETTINGS
// ============================================================================
export const AUDIO_QUALITIES = {
  ORIGINAL: 'original',
  HIGH: 'high',      // 320kbps
  MEDIUM: 'medium',  // 128kbps
  LOW: 'low',        // 64kbps
  PREVIEW: 'preview', // 30s clips
};

export const AUDIO_BITRATES = {
  [AUDIO_QUALITIES.HIGH]: 320,
  [AUDIO_QUALITIES.MEDIUM]: 128,
  [AUDIO_QUALITIES.LOW]: 64,
};

export const QUALITY_FOLDERS = {
  [AUDIO_QUALITIES.ORIGINAL]: 'original/',
  [AUDIO_QUALITIES.HIGH]: 'high/',
  [AUDIO_QUALITIES.MEDIUM]: 'medium/',
  [AUDIO_QUALITIES.LOW]: 'low/',
  [AUDIO_QUALITIES.PREVIEW]: 'previews/',
};

// ============================================================================
// CACHE TTL (Time To Live) in seconds
// ============================================================================
export const CACHE_TTL = {
  HOT_SONGS: 3600,        // 1 hour
  USER_RECENT: 604800,    // 7 days
  TRENDING: 3600,         // 1 hour
  CDN_URLS: 1800,         // 30 minutes
  SEARCH_RESULTS: 1800,   // 30 minutes
  RECOMMENDATIONS: 7200,  // 2 hours
  USER_PREFERENCES: 86400, // 1 day
  PLAYLIST: 3600,         // 1 hour
};

// ============================================================================
// CACHE KEYS
// ============================================================================
export const CACHE_KEYS = {
  HOT_SONG: (id) => `hot:song:${id}`,
  USER_RECENT: (userId) => `user:recent:${userId}`,
  TRENDING_DAILY: () => 'trending:daily',
  CDN_URL: (songId, quality) => `cdn:url:${songId}:${quality}`,
  SEARCH: (query) => `search:${query.toLowerCase()}`,
  RECOMMENDATIONS: (userId) => `rec:${userId}`,
  USER_PREF: (userId) => `pref:${userId}`,
  PLAYLIST: (id) => `playlist:${id}`,
};

// ============================================================================
// USER INTERACTION TYPES
// ============================================================================
export const INTERACTION_TYPES = {
  PLAY: 'play',
  LIKE: 'like',
  SKIP: 'skip',
  DOWNLOAD: 'download',
  SHARE: 'share',
};

// ============================================================================
// PLAYLIST TYPES
// ============================================================================
export const PLAYLIST_TYPES = {
  USER_CREATED: 'user_created',
  AUTO_GENERATED: 'auto_generated',
  FAVORITES: 'favorites',
  RECENTLY_PLAYED: 'recently_played',
  TOP_TRACKS: 'top_tracks',
};

// ============================================================================
// HTTP STATUS CODES
// ============================================================================
export const HTTP_STATUS = {
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
// VALIDATION LIMITS
// ============================================================================
export const LIMITS = {
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
};

// ============================================================================
// SUPPORTED FILE TYPES
// ============================================================================
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',      // MP3
  'audio/mp3',
  'audio/flac',      // FLAC
  'audio/x-flac',
  'audio/wav',       // WAV
  'audio/x-wav',
  'audio/aac',       // AAC
  'audio/ogg',       // OGG
  'audio/webm',      // WebM
];

export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// ============================================================================
// RATE LIMITING
// ============================================================================
export const RATE_LIMITS = {
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
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================
export const ERROR_MESSAGES = {
  // Auth
  UNAUTHORIZED: 'Authentication required',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  
  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  REQUIRED_FIELD: 'This field is required',
  
  // Resources
  NOT_FOUND: 'Resource not found',
  SONG_NOT_FOUND: 'Song not found',
  PLAYLIST_NOT_FOUND: 'Playlist not found',
  USER_NOT_FOUND: 'User not found',
  
  // Operations
  OPERATION_FAILED: 'Operation failed',
  UPLOAD_FAILED: 'File upload failed',
  DELETE_FAILED: 'Delete operation failed',
  UPDATE_FAILED: 'Update operation failed',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  
  // Server
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
};

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  OPERATION_SUCCESS: 'Operation completed successfully',
  
  // Auth
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTER_SUCCESS: 'Registration successful',
  
  // Songs
  SONG_UPLOADED: 'Song uploaded successfully',
  SONG_DELETED: 'Song deleted successfully',
  
  // Playlists
  PLAYLIST_CREATED: 'Playlist created successfully',
  PLAYLIST_UPDATED: 'Playlist updated successfully',
  PLAYLIST_DELETED: 'Playlist deleted successfully',
  SONG_ADDED_TO_PLAYLIST: 'Song added to playlist',
  SONG_REMOVED_FROM_PLAYLIST: 'Song removed from playlist',
};

// ============================================================================
// CLOUDFLARE R2 CONFIG
// ============================================================================
export const R2_CONFIG = {
  SIGNED_URL_EXPIRY: 3600, // 1 hour
  MAX_UPLOAD_SIZE: 100 * 1024 * 1024, // 100MB
  MULTIPART_THRESHOLD: 10 * 1024 * 1024, // 10MB
};

// ============================================================================
// RECOMMENDATION SETTINGS
// ============================================================================
export const RECOMMENDATION_CONFIG = {
  MIN_INTERACTIONS: 5, // Minimum interactions before generating recommendations
  MAX_RECOMMENDATIONS: 50,
  DEFAULT_RECOMMENDATIONS: 20,
  SIMILARITY_THRESHOLD: 0.7,
};

// ============================================================================
// SEARCH SETTINGS
// ============================================================================
export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 50,
  DEFAULT_RESULTS: 20,
  FUZZY_MATCH_THRESHOLD: 0.6,
};

// ============================================================================
// TRENDING CALCULATION
// ============================================================================
export const TRENDING_CONFIG = {
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
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// ============================================================================
// REGEX PATTERNS
// ============================================================================
export const REGEX = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/i,
};

// ============================================================================
// ENVIRONMENT
// ============================================================================
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

// ============================================================================
// LOG LEVELS
// ============================================================================
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug',
};

export default {
  AUDIO_QUALITIES,
  AUDIO_BITRATES,
  QUALITY_FOLDERS,
  CACHE_TTL,
  CACHE_KEYS,
  INTERACTION_TYPES,
  PLAYLIST_TYPES,
  HTTP_STATUS,
  LIMITS,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_IMAGE_FORMATS,
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
};
