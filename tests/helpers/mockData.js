/**
 * Test Data Factories
 * Reusable functions to create mock data for tests
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Create mock user data
 */
export const createMockUser = (overrides = {}) => ({
  id: uuidv4(),
  email: `test-${Date.now()}@example.com`,
  password: 'Password123!',
  confirmPassword: 'Password123!',
  username: `testuser_${Date.now()}`,
  full_name: 'Test User',
  ...overrides,
});

/**
 * Create mock song data
 */
export const createMockSong = (overrides = {}) => ({
  id: uuidv4(),
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  album_art_url: 'https://example.com/album-art.jpg',
  duration_ms: 180000, // 3 minutes
  r2_key: `songs/${uuidv4()}.mp3`,
  file_sizes: {
    original: 28946239,
    high: 7123241,
    medium: 3232401,
    low: 1583230,
  },
  play_count: 0,
  popularity_score: 0,
  metadata: {},
  ...overrides,
});

/**
 * Create mock playlist data
 */
export const createMockPlaylist = (overrides = {}) => ({
  id: uuidv4(),
  user_id: uuidv4(),
  name: `Test Playlist ${Date.now()}`,
  description: 'Test playlist description',
  song_ids: [],
  auto_generated: false,
  is_public: false,
  ...overrides,
});

/**
 * Create mock user interaction data
 */
export const createMockInteraction = (overrides = {}) => ({
  id: uuidv4(),
  user_id: uuidv4(),
  song_id: uuidv4(),
  action_type: 'play',
  session_id: uuidv4(),
  metadata: {},
  ...overrides,
});

/**
 * Create mock user preferences data
 */
export const createMockPreferences = (overrides = {}) => ({
  user_id: uuidv4(),
  preferred_quality: 'high',
  auto_download: false,
  download_quality: 'medium',
  data_saver_mode: false,
  theme: 'dark',
  settings: {},
  ...overrides,
});

/**
 * Create mock JWT token payload
 */
export const createMockTokenPayload = (overrides = {}) => ({
  userId: uuidv4(),
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  ...overrides,
});

/**
 * Create mock audio file buffer
 */
export const createMockAudioBuffer = (sizeInKB = 100) => {
  return Buffer.alloc(sizeInKB * 1024, 'a');
};

/**
 * Create mock Multer file object
 */
export const createMockFile = (overrides = {}) => ({
  fieldname: 'audio',
  originalname: 'test-song.mp3',
  encoding: '7bit',
  mimetype: 'audio/mpeg',
  buffer: createMockAudioBuffer(100),
  size: 102400, // 100KB
  ...overrides,
});

/**
 * Create mock request object for Express
 */
export const createMockRequest = (overrides = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  user: null,
  file: null,
  files: null,
  ...overrides,
});

/**
 * Create mock response object for Express
 */
export const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create mock next function for Express middleware
 */
export const createMockNext = () => jest.fn();

/**
 * Create mock listening pattern (MongoDB)
 */
export const createMockListeningPattern = (overrides = {}) => ({
  userId: uuidv4(),
  songId: uuidv4(),
  playCount: 1,
  lastPlayed: new Date(),
  totalDuration: 180000,
  skipCount: 0,
  likeStatus: false,
  ...overrides,
});

/**
 * Create mock recommendation cache (MongoDB)
 */
export const createMockRecommendationCache = (overrides = {}) => ({
  userId: uuidv4(),
  recommendations: [],
  generatedAt: new Date(),
  expiresAt: new Date(Date.now() + 3600000), // 1 hour
  ...overrides,
});

/**
 * Create array of mock songs
 */
export const createMockSongs = (count = 5) => {
  return Array.from({ length: count }, (_, i) => 
    createMockSong({
      title: `Test Song ${i + 1}`,
      artist: `Test Artist ${(i % 3) + 1}`,
    })
  );
};

/**
 * Wait for async operations (test helper)
 */
export const waitFor = (ms = 100) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean string for comparison (removes whitespace, case-insensitive)
 */
export const cleanString = (str) => 
  str.replace(/\s+/g, '').toLowerCase();
