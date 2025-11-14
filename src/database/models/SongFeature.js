import mongoose from 'mongoose';

const songFeatureSchema = new mongoose.Schema(
  {
    songId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Audio Analysis Features
    acousticness: {
      type: Number,
      min: 0,
      max: 1,
    },
    danceability: {
      type: Number,
      min: 0,
      max: 1,
    },
    energy: {
      type: Number,
      min: 0,
      max: 1,
    },
    instrumentalness: {
      type: Number,
      min: 0,
      max: 1,
    },
    liveness: {
      type: Number,
      min: 0,
      max: 1,
    },
    loudness: {
      type: Number,
    },
    speechiness: {
      type: Number,
      min: 0,
      max: 1,
    },
    valence: {
      type: Number,
      min: 0,
      max: 1,
    },
    tempo: {
      type: Number,
      min: 0,
    },
    // Musical Features
    key: {
      type: Number,
      min: -1,
      max: 11,
    },
    mode: {
      type: Number,
      enum: [0, 1],
    },
    timeSignature: {
      type: Number,
      min: 3,
      max: 7,
    },
    // Genre Classification
    genres: {
      type: [String],
      default: [],
    },
    primaryGenre: {
      type: String,
      index: true,
    },
    // Mood Classification
    mood: {
      type: String,
      enum: [
        'happy',
        'sad',
        'energetic',
        'calm',
        'aggressive',
        'romantic',
        'melancholic',
        'uplifting',
        'dark',
        'chill',
      ],
      index: true,
    },
    moodScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    // Popularity Metrics
    popularityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    trendingScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Engagement Metrics
    totalPlays: {
      type: Number,
      default: 0,
    },
    uniqueListeners: {
      type: Number,
      default: 0,
    },
    avgCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    skipRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    playlistAddCount: {
      type: Number,
      default: 0,
    },
    // Similarity Features (for recommendation)
    similarSongs: [
      {
        songId: String,
        similarityScore: {
          type: Number,
          min: 0,
          max: 1,
        },
      },
    ],
    // Vector embedding for ML (optional)
    embedding: {
      type: [Number],
      select: false,
    },
    // Metadata
    analysisSource: {
      type: String,
      enum: ['spotify', 'lastfm', 'custom', 'ml_model'],
    },
    lastAnalyzed: {
      type: Date,
      default: Date.now,
    },
    needsReanalysis: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'song_features',
  },
);

// Index for similarity search
songFeatureSchema.index({ primaryGenre: 1, mood: 1, popularityScore: -1 });
songFeatureSchema.index({ tempo: 1, energy: 1 });
songFeatureSchema.index({ valence: 1, danceability: 1 });

// Virtual for overall quality score
songFeatureSchema.virtual('qualityScore').get(function () {
  const playWeight = Math.min(this.totalPlays / 1000, 1) * 0.3;
  const completionWeight = this.avgCompletionRate * 0.3;
  const engagementWeight = Math.min((this.likeCount + this.playlistAddCount) / 100, 1) * 0.2;
  const popularityWeight = (this.popularityScore / 100) * 0.2;

  return playWeight + completionWeight + engagementWeight + popularityWeight;
});

// Static method to find similar songs
songFeatureSchema.statics.findSimilarSongs = async function (songId, limit = 10) {
  const song = await this.findOne({ songId });
  if (!song) return [];

  // Find songs with similar features
  const similar = await this.aggregate([
    {
      $match: {
        songId: { $ne: songId },
        primaryGenre: song.primaryGenre,
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
                  { $pow: [{ $subtract: ['$energy', song.energy] }, 2] },
                  { $pow: [{ $subtract: ['$valence', song.valence] }, 2] },
                  { $pow: [{ $subtract: ['$danceability', song.danceability] }, 2] },
                  { $pow: [{ $subtract: [{ $divide: ['$tempo', 200] }, song.tempo / 200] }, 2] },
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
        popularityScore: 1,
        _id: 0,
      },
    },
  ]);

  return similar;
};

// Static method to get trending songs by genre
songFeatureSchema.statics.getTrendingSongs = async function (genre = null, limit = 20) {
  const match = genre ? { primaryGenre: genre } : {};

  return await this.aggregate([
    { $match: match },
    {
      $addFields: {
        trendScore: {
          $add: [
            { $multiply: ['$trendingScore', 0.4] },
            { $multiply: ['$popularityScore', 0.3] },
            { $multiply: [{ $min: [{ $divide: ['$totalPlays', 1000] }, 100] }, 0.3] },
          ],
        },
      },
    },
    { $sort: { trendScore: -1 } },
    { $limit: limit },
    {
      $project: {
        songId: 1,
        trendScore: 1,
        popularityScore: 1,
        totalPlays: 1,
        _id: 0,
      },
    },
  ]);
};

// Static method to update song metrics from listening patterns
songFeatureSchema.statics.updateMetricsFromPatterns = async function (
  songId,
  patterns,
) {
  const totalPlays = patterns.length;
  const uniqueListeners = new Set(patterns.map((p) => p.userId)).size;
  const avgCompletionRate =
    patterns.reduce((sum, p) => sum + p.completionRate, 0) / totalPlays;
  const skipRate = patterns.filter((p) => p.skipped).length / totalPlays;
  const likeCount = patterns.filter((p) => p.liked).length;
  const playlistAddCount = patterns.filter((p) => p.addedToPlaylist).length;

  // Calculate popularity score (0-100)
  const popularityScore = Math.min(
    (totalPlays / 10) * 0.3 +
      avgCompletionRate * 30 +
      (1 - skipRate) * 20 +
      Math.min(likeCount / 10, 10) +
      Math.min(uniqueListeners / 5, 10),
    100,
  );

  return await this.findOneAndUpdate(
    { songId },
    {
      $set: {
        totalPlays,
        uniqueListeners,
        avgCompletionRate,
        skipRate,
        likeCount,
        playlistAddCount,
        popularityScore,
        lastAnalyzed: new Date(),
      },
    },
    { new: true, upsert: true },
  );
};

const SongFeature = mongoose.model('SongFeature', songFeatureSchema);

export default SongFeature;
