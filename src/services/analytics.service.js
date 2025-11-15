import { ListeningPattern, SongFeature } from '../database/models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Analytics Service for processing listening patterns and generating insights
 */
class AnalyticsService {
  /**
   * Track a listening event
   */
  static async trackListening(data) {
    try {
      const {
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
      } = data;

      // Calculate completion rate
      const completionRate = Math.min(playDuration / songDuration, 1);

      // Get time context
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hourOfDay = now.getHours();

      const pattern = await ListeningPattern.create({
        userId,
        songId,
        playDuration,
        completionRate,
        skipped: skipped || false,
        skipPosition,
        source,
        deviceType: deviceType || 'mobile',
        networkType,
        quality: quality || 'high',
        dayOfWeek,
        hourOfDay,
        liked: liked || false,
        addedToPlaylist: addedToPlaylist || false,
        shared: shared || false,
        replayed: replayed || false,
        sessionId,
        sessionPosition,
      });

      logger.info(`Listening pattern tracked: ${userId} -> ${songId}`);

      // Update song features asynchronously
      this.updateSongMetrics(songId).catch((err) =>
        logger.error('Error updating song metrics:', err),
      );

      return pattern;
    } catch (error) {
      logger.error('Error tracking listening pattern:', error);
      throw error;
    }
  }

  /**
   * Update song metrics from listening patterns
   */
  static async updateSongMetrics(songId) {
    try {
      // Get recent patterns (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patterns = await ListeningPattern.find({
        songId,
        timestamp: { $gte: thirtyDaysAgo },
      });

      if (patterns.length === 0) {
        return null;
      }

      return await SongFeature.updateMetricsFromPatterns(songId, patterns);
    } catch (error) {
      logger.error('Error updating song metrics:', error);
      throw error;
    }
  }

  /**
   * Get user listening stats
   */
  static async getUserStats(userId, days = 30) {
    try {
      return await ListeningPattern.getUserStats(userId, days);
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Get user's top songs
   */
  static async getUserTopSongs(userId, limit = 20, days = 30) {
    try {
      return await ListeningPattern.getUserTopSongs(userId, limit, days);
    } catch (error) {
      logger.error('Error getting user top songs:', error);
      throw error;
    }
  }

  /**
   * Get user listening time patterns
   */
  static async getUserTimePatterns(userId) {
    try {
      return await ListeningPattern.getTimePatterns(userId);
    } catch (error) {
      logger.error('Error getting user time patterns:', error);
      throw error;
    }
  }

  /**
   * Get user genre preferences
   */
  static async getUserGenrePreferences(userId, days = 30) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

      const patterns = await ListeningPattern.find({
        userId,
        timestamp: { $gte: thirtyDaysAgo },
      }).distinct('songId');

      const features = await SongFeature.find({
        songId: { $in: patterns },
      });

      const genreCounts = {};
      features.forEach((feature) => {
        if (feature.primaryGenre) {
          genreCounts[feature.primaryGenre] =
            (genreCounts[feature.primaryGenre] || 0) + 1;
        }
      });

      const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([genre, count]) => ({ genre, count }));

      return sortedGenres;
    } catch (error) {
      logger.error('Error getting user genre preferences:', error);
      throw error;
    }
  }

  /**
   * Get user mood preferences
   */
  static async getUserMoodPreferences(userId, days = 30) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

      const patterns = await ListeningPattern.find({
        userId,
        timestamp: { $gte: thirtyDaysAgo },
      }).distinct('songId');

      const features = await SongFeature.find({
        songId: { $in: patterns },
      });

      const moodCounts = {};
      features.forEach((feature) => {
        if (feature.mood) {
          moodCounts[feature.mood] = (moodCounts[feature.mood] || 0) + 1;
        }
      });

      const sortedMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([mood, count]) => ({ mood, count }));

      return sortedMoods;
    } catch (error) {
      logger.error('Error getting user mood preferences:', error);
      throw error;
    }
  }

  /**
   * Get global trending songs
   */
  static async getTrendingSongs(genre = null, limit = 20, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get most played songs in the period
      const trendingPipeline = [
        {
          $match: {
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$songId',
            playCount: { $sum: 1 },
            uniqueListeners: { $addToSet: '$userId' },
            avgCompletionRate: { $avg: '$completionRate' },
          },
        },
        {
          $project: {
            songId: '$_id',
            playCount: 1,
            uniqueListeners: { $size: '$uniqueListeners' },
            avgCompletionRate: 1,
            trendScore: {
              $add: [
                { $multiply: ['$playCount', 0.4] },
                { $multiply: [{ $size: '$uniqueListeners' }, 0.3] },
                { $multiply: ['$avgCompletionRate', 30] },
              ],
            },
          },
        },
        {
          $sort: { trendScore: -1 },
        },
        {
          $limit: limit,
        },
      ];

      const trending = await ListeningPattern.aggregate(trendingPipeline);

      // If genre filter, get only songs from that genre
      if (genre) {
        const songIds = trending.map((t) => t.songId);
        const genreSongs = await SongFeature.find({
          songId: { $in: songIds },
          primaryGenre: genre,
        }).select('songId');

        const genreSongIds = new Set(genreSongs.map((s) => s.songId));
        return trending.filter((t) => genreSongIds.has(t.songId));
      }

      return trending;
    } catch (error) {
      logger.error('Error getting trending songs:', error);
      throw error;
    }
  }

  /**
   * Calculate song popularity scores (batch update)
   */
  static async calculatePopularityScores() {
    try {
      const songs = await SongFeature.find({});
      let updated = 0;

      for (const song of songs) {
        const patterns = await ListeningPattern.find({
          songId: song.songId,
        });

        if (patterns.length > 0) {
          await SongFeature.updateMetricsFromPatterns(song.songId, patterns);
          updated++;
        }
      }

      logger.info(`Updated popularity scores for ${updated} songs`);
      return { updated, total: songs.length };
    } catch (error) {
      logger.error('Error calculating popularity scores:', error);
      throw error;
    }
  }
}

export default AnalyticsService;
