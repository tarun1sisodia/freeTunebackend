import mongoose from 'mongoose';

const recommendationCacheSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // Recommendation type
    type: {
      type: String,
      required: true,
      enum: [
        'daily_mix',
        'discover_weekly',
        'similar_to_song',
        'similar_to_artist',
        'mood_based',
        'genre_based',
        'time_based',
        'trending',
        'personalized',
      ],
      index: true,
    },
    // Context (for specific recommendation types)
    context: {
      songId: String,
      artistId: String,
      genre: String,
      mood: String,
      playlistId: String,
    },
    // Recommended songs with scores
    recommendations: [
      {
        songId: {
          type: String,
          required: true,
        },
        score: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
        reason: {
          type: String,
          enum: [
            'similar_features',
            'listening_history',
            'collaborative_filtering',
            'trending',
            'genre_match',
            'mood_match',
            'time_pattern',
          ],
        },
        confidence: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.5,
        },
      },
    ],
    // Algorithm metadata
    algorithm: {
      version: {
        type: String,
        default: '1.0',
      },
      modelType: {
        type: String,
        enum: [
          'content_based',
          'collaborative',
          'hybrid',
          'matrix_factorization',
          'neural_network',
        ],
        default: 'hybrid',
      },
      features: {
        type: [String],
        default: [],
      },
    },
    // Performance metrics
    metrics: {
      generationTime: {
        type: Number,
      },
      dataPoints: {
        type: Number,
      },
      avgSimilarity: {
        type: Number,
        min: 0,
        max: 1,
      },
    },
    // Engagement tracking
    engagement: {
      views: {
        type: Number,
        default: 0,
      },
      plays: {
        type: Number,
        default: 0,
      },
      likes: {
        type: Number,
        default: 0,
      },
      skips: {
        type: Number,
        default: 0,
      },
      clickThroughRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      avgCompletionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
    },
    // Cache management
    expiresAt: {
      type: Date,
      required: true,
    },
    refreshAfter: {
      type: Date,
    },
    isStale: {
      type: Boolean,
      default: false,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'recommendation_cache',
  },
);

// Compound indexes
recommendationCacheSchema.index({ userId: 1, type: 1 });
recommendationCacheSchema.index({ userId: 1, expiresAt: 1 });
recommendationCacheSchema.index({ 'context.songId': 1 });
recommendationCacheSchema.index({ 'context.genre': 1, 'context.mood': 1 });

// TTL index - automatically delete expired recommendations
recommendationCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for recommendation effectiveness
recommendationCacheSchema.virtual('effectiveness').get(function () {
  if (this.engagement.views === 0) return 0;

  const ctr = this.engagement.clickThroughRate * 0.3;
  const completionRate = this.engagement.avgCompletionRate * 0.3;
  const likeRate =
    this.engagement.views > 0 ? (this.engagement.likes / this.engagement.views) * 0.2 : 0;
  const skipRate =
    this.engagement.plays > 0 ? 1 - this.engagement.skips / this.engagement.plays : 0;
  const skipWeight = skipRate * 0.2;

  return ctr + completionRate + likeRate + skipWeight;
});

// Static method to get or create cache
recommendationCacheSchema.statics.getOrCreate = async function (
  userId,
  type,
  context = {},
  ttlHours = 24,
) {
  const query = { userId, type };

  // Add context to query if provided
  if (context.songId) query['context.songId'] = context.songId;
  if (context.artistId) query['context.artistId'] = context.artistId;
  if (context.genre) query['context.genre'] = context.genre;
  if (context.mood) query['context.mood'] = context.mood;

  const existing = await this.findOne({
    ...query,
    expiresAt: { $gt: new Date() },
    isStale: false,
  });

  if (existing) {
    // Update access tracking
    existing.lastAccessed = new Date();
    existing.accessCount += 1;
    await existing.save();
    return { cache: existing, isNew: false };
  }

  // Create new cache entry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  const refreshAfter = new Date();
  refreshAfter.setHours(refreshAfter.getHours() + Math.floor(ttlHours * 0.75));

  const newCache = await this.create({
    userId,
    type,
    context,
    recommendations: [],
    expiresAt,
    refreshAfter,
  });

  return { cache: newCache, isNew: true };
};

// Static method to update recommendations
recommendationCacheSchema.statics.updateRecommendations = async function (
  cacheId,
  recommendations,
  algorithm = {},
  metrics = {},
) {
  return await this.findByIdAndUpdate(
    cacheId,
    {
      $set: {
        recommendations,
        algorithm,
        metrics,
        isStale: false,
      },
    },
    { new: true },
  );
};

// Static method to track engagement
recommendationCacheSchema.statics.trackEngagement = async function (
  cacheId,
  event,
) {
  const update = {};

  switch (event) {
  case 'view':
    update['engagement.views'] = 1;
    break;
  case 'play':
    update['engagement.plays'] = 1;
    break;
  case 'like':
    update['engagement.likes'] = 1;
    break;
  case 'skip':
    update['engagement.skips'] = 1;
    break;
  }

  const cache = await this.findByIdAndUpdate(
    cacheId,
    {
      $inc: update,
      $set: { lastAccessed: new Date() },
    },
    { new: true },
  );

  if (cache && event === 'play') {
    const ctr = cache.engagement.plays / cache.engagement.views;
    cache.engagement.clickThroughRate = ctr;
    await cache.save();
  }

  return cache;
};

// Static method to get stale recommendations for refresh
recommendationCacheSchema.statics.getStaleRecommendations = async function (
  limit = 100,
) {
  return await this.find({
    $or: [{ refreshAfter: { $lt: new Date() } }, { isStale: true }],
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastAccessed: -1 })
    .limit(limit);
};

// Static method to get user recommendation performance
recommendationCacheSchema.statics.getUserPerformance = async function (
  userId,
  days = 30,
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$type',
        totalViews: { $sum: '$engagement.views' },
        totalPlays: { $sum: '$engagement.plays' },
        totalLikes: { $sum: '$engagement.likes' },
        totalSkips: { $sum: '$engagement.skips' },
        avgCTR: { $avg: '$engagement.clickThroughRate' },
        avgCompletionRate: { $avg: '$engagement.avgCompletionRate' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        type: '$_id',
        totalViews: 1,
        totalPlays: 1,
        totalLikes: 1,
        totalSkips: 1,
        avgCTR: 1,
        avgCompletionRate: 1,
        count: 1,
        effectiveness: {
          $add: [
            { $multiply: ['$avgCTR', 0.4] },
            { $multiply: ['$avgCompletionRate', 0.4] },
            {
              $multiply: [
                { $cond: [{ $gt: ['$totalViews', 0] }, { $divide: ['$totalLikes', '$totalViews'] }, 0] },
                0.2,
              ],
            },
          ],
        },
        _id: 0,
      },
    },
    {
      $sort: { effectiveness: -1 },
    },
  ]);
};

const RecommendationCache = mongoose.model(
  'RecommendationCache',
  recommendationCacheSchema,
);

export default RecommendationCache;
