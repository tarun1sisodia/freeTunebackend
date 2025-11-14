import mongoose from 'mongoose';

const listeningPatternSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    songId: {
      type: String,
      required: true,
      index: true,
    },
    // Listening behavior
    playDuration: {
      type: Number,
      required: true,
      min: 0,
    },
    completionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    skipped: {
      type: Boolean,
      default: false,
    },
    skipPosition: {
      type: Number,
      min: 0,
    },
    // Context
    source: {
      type: String,
      enum: ['search', 'playlist', 'recommendation', 'album', 'artist', 'radio'],
      required: true,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'tv', 'car', 'other'],
      default: 'mobile',
    },
    networkType: {
      type: String,
      enum: ['wifi', '5g', '4g', '3g', '2g', 'offline'],
    },
    quality: {
      type: String,
      enum: ['original', 'high', 'medium', 'low', 'preview'],
      default: 'high',
    },
    // Time context
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    hourOfDay: {
      type: Number,
      min: 0,
      max: 23,
    },
    // Engagement
    liked: {
      type: Boolean,
      default: false,
    },
    addedToPlaylist: {
      type: Boolean,
      default: false,
    },
    shared: {
      type: Boolean,
      default: false,
    },
    replayed: {
      type: Boolean,
      default: false,
    },
    // Session info
    sessionId: {
      type: String,
      index: true,
    },
    sessionPosition: {
      type: Number,
      min: 0,
    },
    // Metadata
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'listening_patterns',
  },
);

// Compound indexes for common queries
listeningPatternSchema.index({ userId: 1, timestamp: -1 });
listeningPatternSchema.index({ songId: 1, timestamp: -1 });
listeningPatternSchema.index({ userId: 1, songId: 1 });
listeningPatternSchema.index({ sessionId: 1, sessionPosition: 1 });

// TTL index - automatically delete records older than 90 days
listeningPatternSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Virtual for listen quality score (0-1)
listeningPatternSchema.virtual('qualityScore').get(function () {
  let score = this.completionRate * 0.4;
  if (!this.skipped) score += 0.2;
  if (this.liked) score += 0.2;
  if (this.replayed) score += 0.1;
  if (this.addedToPlaylist) score += 0.1;
  return Math.min(score, 1);
});

// Static method to get user listening stats
listeningPatternSchema.statics.getUserStats = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalPlays: { $sum: 1 },
        totalDuration: { $sum: '$playDuration' },
        avgCompletionRate: { $avg: '$completionRate' },
        skipRate: {
          $avg: { $cond: ['$skipped', 1, 0] },
        },
        uniqueSongs: { $addToSet: '$songId' },
        favoriteSource: { $first: '$source' },
      },
    },
    {
      $project: {
        _id: 0,
        totalPlays: 1,
        totalDuration: 1,
        avgCompletionRate: 1,
        skipRate: 1,
        uniqueSongsCount: { $size: '$uniqueSongs' },
        favoriteSource: 1,
      },
    },
  ]);

  return stats[0] || null;
};

// Static method to get top songs for user
listeningPatternSchema.statics.getUserTopSongs = async function (
  userId,
  limit = 20,
  days = 30,
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$songId',
        playCount: { $sum: 1 },
        avgCompletionRate: { $avg: '$completionRate' },
        likeCount: { $sum: { $cond: ['$liked', 1, 0] } },
        totalDuration: { $sum: '$playDuration' },
      },
    },
    {
      $sort: { playCount: -1, avgCompletionRate: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        songId: '$_id',
        playCount: 1,
        avgCompletionRate: 1,
        likeCount: 1,
        totalDuration: 1,
        _id: 0,
      },
    },
  ]);
};

// Static method to get listening time patterns
listeningPatternSchema.statics.getTimePatterns = async function (userId) {
  return await this.aggregate([
    {
      $match: { userId },
    },
    {
      $group: {
        _id: {
          hourOfDay: '$hourOfDay',
          dayOfWeek: '$dayOfWeek',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

const ListeningPattern = mongoose.model('ListeningPattern', listeningPatternSchema);

export default ListeningPattern;
