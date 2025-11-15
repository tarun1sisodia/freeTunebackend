import { successResponse } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../utils/constants.js';
import RecommendationService from '../../services/recommendation.service.js';
import AnalyticsService from '../../services/analytics.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @description Get personalized recommendations for a user
 * @route GET /api/v1/recommendations
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { limit = 20, refresh = false } = req.query;

  const recommendations = await RecommendationService.getPersonalizedRecommendations(
    userId,
    { limit: parseInt(limit), refresh: refresh === 'true' },
  );

  return successResponse(
    res,
    recommendations,
    'Recommendations fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get similar songs to a specific song
 * @route GET /api/v1/recommendations/similar/:songId
 */
const getSimilarSongs = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { limit = 20 } = req.query;

  const similar = await RecommendationService.getSimilarSongs(
    songId,
    parseInt(limit),
  );

  return successResponse(
    res,
    similar,
    'Similar songs fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get mood-based recommendations
 * @route GET /api/v1/recommendations/mood/:mood
 */
const getMoodRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { mood } = req.params;
  const { limit = 20 } = req.query;

  const recommendations = await RecommendationService.getMoodBasedRecommendations(
    userId,
    mood,
    parseInt(limit),
  );

  return successResponse(
    res,
    recommendations,
    'Mood-based recommendations fetched successfully',
    HTTP_STATUS.OK,
  );
});

/**
 * @description Get trending songs
 * @route GET /api/v1/recommendations/trending
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

/**
 * @description Get user stats
 * @route GET /api/v1/recommendations/stats
 */
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { days = 30 } = req.query;

  const stats = await AnalyticsService.getUserStats(userId, parseInt(days));

  return successResponse(res, stats, 'User stats fetched successfully', HTTP_STATUS.OK);
});

/**
 * @description Get user top songs
 * @route GET /api/v1/recommendations/top
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

export {
  getRecommendations,
  getSimilarSongs,
  getMoodRecommendations,
  getTrendingSongs,
  getUserStats,
  getUserTopSongs,
};
