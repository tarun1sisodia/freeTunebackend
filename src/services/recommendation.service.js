import {
  SongFeature,
  RecommendationCache,
  ListeningPattern,
} from '../database/models/index.js';
import { logger } from '../utils/logger.js';
import { getCachedData, setCachedData } from '../utils/cacheHelper.js';

/**
 * Recommendation Service using hybrid ML approach
 * Combines content-based filtering, collaborative filtering, and contextual recommendations
 */
class RecommendationService {
  /**
   * Get personalized recommendations for user
   */
  static async getPersonalizedRecommendations(userId, options = {}) {
    try {
      const { limit = 20, refresh = false } = options;

      // Check cache first
      if (!refresh) {
        const { cache } = await RecommendationCache.getOrCreate(
          userId,
          'personalized',
          {},
          24,
        );

        if (cache.recommendations.length > 0) {
          await RecommendationCache.trackEngagement(cache._id, 'view');
          return cache.recommendations.slice(0, limit);
        }
      }

      // Generate new recommendations
      const recommendations = await this.generateHybridRecommendations(
        userId,
        limit,
      );

      // Cache the results
      const { cache } = await RecommendationCache.getOrCreate(
        userId,
        'personalized',
        {},
        24,
      );

      await RecommendationCache.updateRecommendations(
        cache._id,
        recommendations,
        {
          version: '1.0',
          modelType: 'hybrid',
          features: [
            'content_based',
            'collaborative',
            'listening_history',
            'time_context',
          ],
        },
        {
          generationTime: Date.now(),
          dataPoints: recommendations.length,
        },
      );

      return recommendations;
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate hybrid recommendations combining multiple algorithms
   */
  static async generateHybridRecommendations(userId, limit = 20) {
    try {
      // Get user's listening history
      const topSongs = await ListeningPattern.getUserTopSongs(userId, 10, 30);

      if (topSongs.length === 0) {
        // New user - return trending songs
        return await this.getTrendingRecommendations(limit);
      }

      const recommendations = new Map();
      const weights = {
        contentBased: 0.4,
        collaborative: 0.3,
        trending: 0.2,
        timeContext: 0.1,
      };

      // 1. Content-based recommendations (40%)
      const contentBased = await this.getContentBasedRecommendations(
        topSongs.map((s) => s.songId),
        Math.ceil(limit * weights.contentBased * 2),
      );
      contentBased.forEach((rec) => {
        const existing = recommendations.get(rec.songId) || {
          songId: rec.songId,
          score: 0,
          reasons: [],
        };
        existing.score += rec.score * weights.contentBased;
        existing.reasons.push('similar_features');
        recommendations.set(rec.songId, existing);
      });

      // 2. Collaborative filtering (30%)
      const collaborative = await this.getCollaborativeRecommendations(
        userId,
        Math.ceil(limit * weights.collaborative * 2),
      );
      collaborative.forEach((rec) => {
        const existing = recommendations.get(rec.songId) || {
          songId: rec.songId,
          score: 0,
          reasons: [],
        };
        existing.score += rec.score * weights.collaborative;
        existing.reasons.push('listening_history');
        recommendations.set(rec.songId, existing);
      });

      // 3. Trending songs (20%)
      const trending = await this.getTrendingRecommendations(
        Math.ceil(limit * weights.trending * 2),
      );
      trending.forEach((rec) => {
        const existing = recommendations.get(rec.songId) || {
          songId: rec.songId,
          score: 0,
          reasons: [],
        };
        existing.score += rec.score * weights.trending;
        existing.reasons.push('trending');
        recommendations.set(rec.songId, existing);
      });

      // 4. Time-based context (10%)
      const timeContext = await this.getTimeContextRecommendations(
        userId,
        Math.ceil(limit * weights.timeContext * 2),
      );
      timeContext.forEach((rec) => {
        const existing = recommendations.get(rec.songId) || {
          songId: rec.songId,
          score: 0,
          reasons: [],
        };
        existing.score += rec.score * weights.timeContext;
        existing.reasons.push('time_pattern');
        recommendations.set(rec.songId, existing);
      });

      // Filter out already listened songs
      const listenedSongs = new Set(topSongs.map((s) => s.songId));
      const filtered = Array.from(recommendations.values()).filter(
        (rec) => !listenedSongs.has(rec.songId),
      );

      // Sort by score and return top N
      return filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((rec) => ({
          songId: rec.songId,
          score: rec.score,
          reason: rec.reasons[0],
          confidence: Math.min(rec.score, 1),
        }));
    } catch (error) {
      logger.error('Error generating hybrid recommendations:', error);
      throw error;
    }
  }

  /**
   * Content-based recommendations using audio features
   */
  static async getContentBasedRecommendations(songIds, limit = 20) {
    try {
      // Get features of seed songs
      const seedFeatures = await SongFeature.find({
        songId: { $in: songIds },
      });

      if (seedFeatures.length === 0) {
        return [];
      }

      // Calculate average features
      const avgFeatures = {
        energy: 0,
        valence: 0,
        danceability: 0,
        tempo: 0,
      };

      seedFeatures.forEach((feature) => {
        avgFeatures.energy += feature.energy || 0;
        avgFeatures.valence += feature.valence || 0;
        avgFeatures.danceability += feature.danceability || 0;
        avgFeatures.tempo += feature.tempo || 0;
      });

      Object.keys(avgFeatures).forEach((key) => {
        avgFeatures[key] /= seedFeatures.length;
      });

      // Get primary genre
      const genreCounts = {};
      seedFeatures.forEach((f) => {
        if (f.primaryGenre) {
          genreCounts[f.primaryGenre] = (genreCounts[f.primaryGenre] || 0) + 1;
        }
      });
      const primaryGenre = Object.keys(genreCounts).sort(
        (a, b) => genreCounts[b] - genreCounts[a],
      )[0];

      // Find similar songs
      const similar = await SongFeature.aggregate([
        {
          $match: {
            songId: { $nin: songIds },
            primaryGenre: primaryGenre,
          },
        },
        {
          $addFields: {
            similarity: {
              $subtract: [
                1,
                {
                  $sqrt: {
                    $add: [
                      {
                        $pow: [
                          { $subtract: ['$energy', avgFeatures.energy] },
                          2,
                        ],
                      },
                      {
                        $pow: [
                          { $subtract: ['$valence', avgFeatures.valence] },
                          2,
                        ],
                      },
                      {
                        $pow: [
                          {
                            $subtract: [
                              '$danceability',
                              avgFeatures.danceability,
                            ],
                          },
                          2,
                        ],
                      },
                      {
                        $pow: [
                          {
                            $subtract: [
                              { $divide: ['$tempo', 200] },
                              avgFeatures.tempo / 200,
                            ],
                          },
                          2,
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
        {
          $sort: { similarity: -1, popularityScore: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            songId: 1,
            similarity: 1,
            _id: 0,
          },
        },
      ]);

      return similar.map((s) => ({
        songId: s.songId,
        score: s.similarity,
      }));
    } catch (error) {
      logger.error('Error getting content-based recommendations:', error);
      throw error;
    }
  }

  /**
   * Collaborative filtering recommendations
   */
  static async getCollaborativeRecommendations(userId, limit = 20) {
    try {
      // Get user's listened songs
      const userSongs = await ListeningPattern.find({ userId }).distinct(
        'songId',
      );

      if (userSongs.length === 0) {
        return [];
      }

      // Find other users who listened to similar songs
      const similarUsers = await ListeningPattern.aggregate([
        {
          $match: {
            songId: { $in: userSongs },
            userId: { $ne: userId },
          },
        },
        {
          $group: {
            _id: '$userId',
            commonSongs: { $addToSet: '$songId' },
            totalPlays: { $sum: 1 },
          },
        },
        {
          $addFields: {
            similarity: {
              $divide: [{ $size: '$commonSongs' }, userSongs.length],
            },
          },
        },
        {
          $sort: { similarity: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      if (similarUsers.length === 0) {
        return [];
      }

      const similarUserIds = similarUsers.map((u) => u._id);

      // Get songs listened by similar users but not by current user
      const recommendations = await ListeningPattern.aggregate([
        {
          $match: {
            userId: { $in: similarUserIds },
            songId: { $nin: userSongs },
          },
        },
        {
          $group: {
            _id: '$songId',
            listenCount: { $sum: 1 },
            avgCompletionRate: { $avg: '$completionRate' },
          },
        },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: ['$listenCount', 0.6] },
                { $multiply: ['$avgCompletionRate', 0.4] },
              ],
            },
          },
        },
        {
          $sort: { score: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            songId: '$_id',
            score: 1,
            _id: 0,
          },
        },
      ]);

      // Normalize scores to 0-1
      const maxScore = recommendations[0]?.score || 1;
      return recommendations.map((rec) => ({
        songId: rec.songId,
        score: rec.score / maxScore,
      }));
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', error);
      throw error;
    }
  }

  /**
   * Get trending recommendations
   */
  static async getTrendingRecommendations(limit = 20) {
    try {
      const trending = await SongFeature.getTrendingSongs(null, limit);
      return trending.map((song) => ({
        songId: song.songId,
        score: song.trendScore / 100,
      }));
    } catch (error) {
      logger.error('Error getting trending recommendations:', error);
      throw error;
    }
  }

  /**
   * Time-based context recommendations
   */
  static async getTimeContextRecommendations(userId, limit = 20) {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      // Get songs user typically listens to at this time
      const patterns = await ListeningPattern.find({
        userId,
        hourOfDay: { $gte: currentHour - 1, $lte: currentHour + 1 },
        dayOfWeek: currentDay,
      });

      if (patterns.length === 0) {
        return [];
      }

      // Get song features for these patterns
      const songIds = [...new Set(patterns.map((p) => p.songId))];
      const features = await SongFeature.find({
        songId: { $in: songIds },
      });

      // Calculate average mood/energy for this time
      const avgEnergy =
        features.reduce((sum, f) => sum + (f.energy || 0), 0) /
        features.length;
      const avgValence =
        features.reduce((sum, f) => sum + (f.valence || 0), 0) /
        features.length;

      // Find similar songs
      const similar = await SongFeature.aggregate([
        {
          $match: {
            songId: { $nin: songIds },
            energy: { $gte: avgEnergy - 0.2, $lte: avgEnergy + 0.2 },
            valence: { $gte: avgValence - 0.2, $lte: avgValence + 0.2 },
          },
        },
        {
          $addFields: {
            score: {
              $subtract: [
                1,
                {
                  $add: [
                    { $abs: { $subtract: ['$energy', avgEnergy] } },
                    { $abs: { $subtract: ['$valence', avgValence] } },
                  ],
                },
              ],
            },
          },
        },
        {
          $sort: { score: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            songId: 1,
            score: 1,
            _id: 0,
          },
        },
      ]);

      return similar;
    } catch (error) {
      logger.error('Error getting time context recommendations:', error);
      throw error;
    }
  }

  /**
   * Get recommendations similar to a specific song
   */
  static async getSimilarSongs(songId, limit = 20) {
    try {
      const cacheKey = `similar:${songId}:${limit}`;
      const cached = await getCachedData(cacheKey);

      if (cached) {
        return cached;
      }

      const similar = await SongFeature.findSimilarSongs(songId, limit);
      const recommendations = similar.map((s) => ({
        songId: s.songId,
        score: s.similarity,
        reason: 'similar_features',
        confidence: s.similarity,
      }));

      await setCachedData(cacheKey, recommendations, 3600);

      return recommendations;
    } catch (error) {
      logger.error('Error getting similar songs:', error);
      throw error;
    }
  }

  /**
   * Get mood-based recommendations
   */
  static async getMoodBasedRecommendations(userId, mood, limit = 20) {
    try {
      const { cache } = await RecommendationCache.getOrCreate(
        userId,
        'mood_based',
        { mood },
        24,
      );

      if (cache.recommendations.length > 0) {
        return cache.recommendations.slice(0, limit);
      }

      // Get songs with the specified mood
      const songs = await SongFeature.find({ mood })
        .sort({ popularityScore: -1, avgCompletionRate: -1 })
        .limit(limit * 2);

      // Get user's genre preferences
      const userSongs = await ListeningPattern.find({ userId }).distinct(
        'songId',
      );
      const userFeatures = await SongFeature.find({
        songId: { $in: userSongs },
      });

      const genrePrefs = {};
      userFeatures.forEach((f) => {
        if (f.primaryGenre) {
          genrePrefs[f.primaryGenre] = (genrePrefs[f.primaryGenre] || 0) + 1;
        }
      });

      // Score songs based on genre preference
      const recommendations = songs.map((song) => {
        const genreScore = genrePrefs[song.primaryGenre] || 0;
        const popScore = song.popularityScore / 100;
        const score = genreScore * 0.6 + popScore * 0.4;

        return {
          songId: song.songId,
          score: Math.min(score, 1),
          reason: 'mood_match',
          confidence: song.moodScore || 0.5,
        };
      });

      recommendations.sort((a, b) => b.score - a.score);
      const topRecs = recommendations.slice(0, limit);

      await RecommendationCache.updateRecommendations(
        cache._id,
        topRecs,
        { version: '1.0', modelType: 'content_based', features: ['mood'] },
        { generationTime: Date.now(), dataPoints: topRecs.length },
      );

      return topRecs;
    } catch (error) {
      logger.error('Error getting mood-based recommendations:', error);
      throw error;
    }
  }

  /**
   * Track recommendation engagement
   */
  static async trackEngagement(cacheId, event) {
    try {
      return await RecommendationCache.trackEngagement(cacheId, event);
    } catch (error) {
      logger.error('Error tracking recommendation engagement:', error);
      throw error;
    }
  }

  /**
   * Refresh stale recommendations (cron job)
   */
  static async refreshStaleRecommendations(limit = 100) {
    try {
      const stale = await RecommendationCache.getStaleRecommendations(limit);
      let refreshed = 0;

      for (const cache of stale) {
        try {
          const recommendations = await this.generateHybridRecommendations(
            cache.userId,
            20,
          );

          await RecommendationCache.updateRecommendations(
            cache._id,
            recommendations,
            {
              version: '1.0',
              modelType: 'hybrid',
              features: ['content_based', 'collaborative', 'trending'],
            },
            { generationTime: Date.now(), dataPoints: recommendations.length },
          );

          refreshed++;
        } catch (err) {
          logger.error(`Error refreshing cache ${cache._id}:`, err);
        }
      }

      logger.info(`Refreshed ${refreshed} recommendation caches`);
      return { refreshed, total: stale.length };
    } catch (error) {
      logger.error('Error refreshing stale recommendations:', error);
      throw error;
    }
  }
}

export default RecommendationService;
