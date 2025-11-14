import AnalyticsService from '../services/analytics.service.js';
import RecommendationService from '../services/recommendation.service.js';
import { logger } from '../utils/logger.js';

/**
 * Background Jobs for maintaining ML/Analytics data
 * These should be run periodically via cron (Railway/Vercel Cron)
 */

/**
 * Update popularity scores for all songs
 * Run: Daily at 2 AM
 */
export const updatePopularityScores = async () => {
  try {
    logger.info('Starting popularity score calculation...');
    const result = await AnalyticsService.calculatePopularityScores();
    logger.info(
      `Popularity scores updated: ${result.updated}/${result.total} songs`,
    );
    return result;
  } catch (error) {
    logger.error('Error updating popularity scores:', error);
    throw error;
  }
};

/**
 * Refresh stale recommendation caches
 * Run: Every hour
 */
export const refreshRecommendations = async () => {
  try {
    logger.info('Starting recommendation cache refresh...');
    const result = await RecommendationService.refreshStaleRecommendations(100);
    logger.info(
      `Recommendation caches refreshed: ${result.refreshed}/${result.total}`,
    );
    return result;
  } catch (error) {
    logger.error('Error refreshing recommendations:', error);
    throw error;
  }
};

/**
 * Cleanup old listening patterns (>90 days)
 * Run: Weekly on Sunday at 3 AM
 * Note: MongoDB TTL index handles this automatically, this is a backup
 */
export const cleanupOldPatterns = async () => {
  try {
    logger.info('Starting listening pattern cleanup...');

    // Note: Actual cleanup is handled by MongoDB TTL index
    // This is just for logging and monitoring
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    logger.info('Old patterns cleanup completed (handled by MongoDB TTL)');
    return { status: 'success', message: 'TTL index active' };
  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
};

/**
 * Calculate trending songs
 * Run: Every hour
 */
export const calculateTrendingSongs = async () => {
  try {
    logger.info('Starting trending songs calculation...');

    const genres = [
      'pop',
      'rock',
      'hip-hop',
      'electronic',
      'indie',
      'jazz',
      'classical',
      'r&b',
      'country',
      'metal',
    ];

    const results = {};
    for (const genre of genres) {
      const trending = await AnalyticsService.getTrendingSongs(genre, 20, 7);
      results[genre] = trending.length;
    }

    // Also calculate global trending
    const globalTrending = await AnalyticsService.getTrendingSongs(null, 50, 7);
    results.global = globalTrending.length;

    logger.info('Trending songs calculated:', results);
    return results;
  } catch (error) {
    logger.error('Error calculating trending songs:', error);
    throw error;
  }
};

/**
 * Job registry for easy scheduling
 */
export const jobs = {
  updatePopularityScores: {
    name: 'Update Popularity Scores',
    schedule: '0 2 * * *', // Daily at 2 AM
    handler: updatePopularityScores,
  },
  refreshRecommendations: {
    name: 'Refresh Recommendations',
    schedule: '0 * * * *', // Every hour
    handler: refreshRecommendations,
  },
  cleanupOldPatterns: {
    name: 'Cleanup Old Patterns',
    schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
    handler: cleanupOldPatterns,
  },
  calculateTrendingSongs: {
    name: 'Calculate Trending Songs',
    schedule: '0 * * * *', // Every hour
    handler: calculateTrendingSongs,
  },
};

export default jobs;
