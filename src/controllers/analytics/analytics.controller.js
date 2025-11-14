import { successResponse } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../utils/constants.js';
import AnalyticsService from '../../services/analytics.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @description Track a listening event
 * @route POST /api/v1/analytics/track
 */
const trackListening = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const {
    songId,
    playDuration,
    songDuration,
    skipped,
    skipPosition,
    source,
    deviceType,
    networkType,
    quality,
    liked,
    addedToPlaylist,
    shared,
    replayed,
    sessionId,
    sessionPosition,
  } = req.body;

  const pattern = await AnalyticsService.trackListening({
    userId,
    songId,
    playDuration,
    songDuration,
    skipped,
    skipPosition,
    source,
    deviceType,
    networkType,
    quality,
    liked,
    addedToPlaylist,
    shared,
    replayed,
    sessionId,
    sessionPosition,
  });

  return successResponse(
    res,
    { patternId: pattern._id },
    'Listening event tracked successfully',
    HTTP_STATUS.CREATED,
  );
});

/**
 * @description Get user listening stats
 * @route GET /api/v1/analytics/stats
 */
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { days = 30 } = req.query;

  const stats = await AnalyticsService.getUserStats(userId, parseInt(days));

  return successResponse(
    res,
    stats,
    'User stats fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get user top songs
 * @route GET /api/v1/analytics/top-songs
 */
const getUserTopSongs = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { limit = 20, days = 30 } = req.query;

  const topSongs = await AnalyticsService.getUserTopSongs(
    userId,
    parseInt(limit),
    parseInt(days),
  );

  return successResponse(
    res,
    topSongs,
    'Top songs fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get user listening time patterns
 * @route GET /api/v1/analytics/time-patterns
 */
const getUserTimePatterns = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  const patterns = await AnalyticsService.getUserTimePatterns(userId);

  return successResponse(
    res,
    patterns,
    'Time patterns fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get user genre preferences
 * @route GET /api/v1/analytics/genre-preferences
 */
const getUserGenrePreferences = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { days = 30 } = req.query;

  const genres = await AnalyticsService.getUserGenrePreferences(
    userId,
    parseInt(days),
  );

  return successResponse(
    res,
    genres,
    'Genre preferences fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get user mood preferences
 * @route GET /api/v1/analytics/mood-preferences
 */
const getUserMoodPreferences = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { days = 30 } = req.query;

  const moods = await AnalyticsService.getUserMoodPreferences(
    userId,
    parseInt(days),
  );

  return successResponse(
    res,
    moods,
    'Mood preferences fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get global trending songs
 * @route GET /api/v1/analytics/trending
 */
const getTrendingSongs = asyncHandler(async (req, res) => {
  const { genre = null, limit = 20, days = 7 } = req.query;

  const trending = await AnalyticsService.getTrendingSongs(
    genre,
    parseInt(limit),
    parseInt(days),
  );

  return successResponse(
    res,
    trending,
    'Trending songs fetched successfully',
    HTTP_STATUS.OK,
  );
});

export {
  trackListening,
  getUserStats,
  getUserTopSongs,
  getUserTimePatterns,
  getUserGenrePreferences,
  getUserMoodPreferences,
  getTrendingSongs,
};
