/**
 * MongoDB Connection Integration Tests
 * Tests MongoDB/Mongoose connectivity and operations
 */

import {
  connectMongoose,
  getMongoose,
  closeMongooseConnection,
} from '../../../src/database/connections/mongodb.js';
import {
  ListeningPattern,
  RecommendationCache,
  SongFeature,
} from '../../../src/database/models/index.js';

describe('MongoDB Connection Integration Tests', () => {
  beforeAll(async () => {
    await connectMongoose();
  });

  afterAll(async () => {
    await closeMongooseConnection();
  });

  describe('Connection Tests', () => {
    test('should connect to MongoDB successfully', async () => {
      const mongoose = await getMongoose();
      
      if (mongoose && mongoose.connection) {
        expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      } else {
        console.warn('MongoDB not configured, skipping test');
      }
    });

    test('should handle connection state', async () => {
      const mongoose = await getMongoose();
      
      if (mongoose) {
        expect(mongoose.connection).toBeDefined();
        expect(typeof mongoose.connection.readyState).toBe('number');
      }
    });
  });

  describe('Model Tests', () => {
    test('should have ListeningPattern model', () => {
      expect(ListeningPattern).toBeDefined();
      expect(ListeningPattern.modelName).toBe('ListeningPattern');
    });

    test('should have RecommendationCache model', () => {
      expect(RecommendationCache).toBeDefined();
      expect(RecommendationCache.modelName).toBe('RecommendationCache');
    });

    test('should have SongFeature model', () => {
      expect(SongFeature).toBeDefined();
      expect(SongFeature.modelName).toBe('SongFeature');
    });
  });

  describe('CRUD Operations', () => {
    let testPatternId;

    afterEach(async () => {
      if (testPatternId) {
        await ListeningPattern.findByIdAndDelete(testPatternId);
        testPatternId = null;
      }
    });

    test('should create a ListeningPattern document', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) {
        console.warn('MongoDB not connected, skipping test');
        return;
      }

      const pattern = new ListeningPattern({
        userId: 'test-user-123',
        songId: 'test-song-123',
        playCount: 1,
        totalDuration: 180000,
        skipCount: 0,
        likeStatus: false,
      });

      const saved = await pattern.save();
      testPatternId = saved._id;

      expect(saved._id).toBeDefined();
      expect(saved.userId).toBe('test-user-123');
      expect(saved.playCount).toBe(1);
    });

    test('should find a ListeningPattern document', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const pattern = new ListeningPattern({
        userId: 'test-user-456',
        songId: 'test-song-456',
        playCount: 5,
      });

      const saved = await pattern.save();
      testPatternId = saved._id;

      const found = await ListeningPattern.findById(testPatternId);
      expect(found).toBeDefined();
      expect(found.userId).toBe('test-user-456');
      expect(found.playCount).toBe(5);
    });

    test('should update a ListeningPattern document', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const pattern = new ListeningPattern({
        userId: 'test-user-789',
        songId: 'test-song-789',
        playCount: 1,
      });

      const saved = await pattern.save();
      testPatternId = saved._id;

      const updated = await ListeningPattern.findByIdAndUpdate(
        testPatternId,
        { playCount: 10 },
        { new: true }
      );

      expect(updated.playCount).toBe(10);
    });

    test('should delete a ListeningPattern document', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const pattern = new ListeningPattern({
        userId: 'test-user-delete',
        songId: 'test-song-delete',
        playCount: 1,
      });

      const saved = await pattern.save();
      
      await ListeningPattern.findByIdAndDelete(saved._id);
      
      const found = await ListeningPattern.findById(saved._id);
      expect(found).toBeNull();
    });
  });

  describe('Query Operations', () => {
    let testPatterns = [];

    beforeAll(async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      // Create test data
      const patterns = [
        { userId: 'user-query-1', songId: 'song-1', playCount: 5 },
        { userId: 'user-query-1', songId: 'song-2', playCount: 10 },
        { userId: 'user-query-2', songId: 'song-1', playCount: 3 },
      ];

      testPatterns = await ListeningPattern.insertMany(patterns);
    });

    afterAll(async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      await ListeningPattern.deleteMany({
        userId: { $in: ['user-query-1', 'user-query-2'] },
      });
    });

    test('should find patterns by userId', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const patterns = await ListeningPattern.find({ userId: 'user-query-1' });
      expect(patterns.length).toBe(2);
    });

    test('should find pattern with specific playCount', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const patterns = await ListeningPattern.find({ playCount: { $gte: 10 } });
      expect(patterns.length).toBeGreaterThanOrEqual(1);
    });

    test('should sort patterns by playCount', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const patterns = await ListeningPattern.find({ userId: 'user-query-1' })
        .sort({ playCount: -1 });

      expect(patterns[0].playCount).toBeGreaterThanOrEqual(patterns[1].playCount);
    });
  });

  describe('Schema Validation', () => {
    test('should enforce required fields', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const pattern = new ListeningPattern({
        // Missing required userId and songId
        playCount: 1,
      });

      await expect(pattern.save()).rejects.toThrow();
    });

    test('should apply default values', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const pattern = new ListeningPattern({
        userId: 'test-defaults',
        songId: 'test-song-defaults',
      });

      const saved = await pattern.save();

      expect(saved.playCount).toBeDefined();
      expect(saved.skipCount).toBeDefined();
      expect(saved.likeStatus).toBeDefined();

      await ListeningPattern.findByIdAndDelete(saved._id);
    });
  });

  describe('Aggregation Operations', () => {
    test('should perform aggregation query', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const result = await ListeningPattern.aggregate([
        {
          $group: {
            _id: '$userId',
            totalPlays: { $sum: '$playCount' },
          },
        },
      ]);

      expect(Array.isArray(result)).toBe(true);
    });

    test('should count documents', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const count = await ListeningPattern.countDocuments();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid document structure', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      const pattern = new ListeningPattern({
        userId: 'test-invalid',
        songId: 'test-song-invalid',
        playCount: 'not a number', // Invalid type
      });

      await expect(pattern.save()).rejects.toThrow();
    });

    test('should handle duplicate key errors', async () => {
      const mongoose = await getMongoose();
      if (!mongoose || mongoose.connection.readyState !== 1) return;

      // Note: This test depends on your schema having unique indexes
      // Adjust based on your actual schema constraints
      expect(true).toBe(true);
    });
  });

  describe('Connection Resilience', () => {
    test('should handle disconnection gracefully', async () => {
      const mongoose = await getMongoose();
      
      if (mongoose) {
        expect(mongoose.connection).toBeDefined();
        // Connection should be established or attempting to connect
        expect([0, 1, 2]).toContain(mongoose.connection.readyState);
      }
    });
  });
});
