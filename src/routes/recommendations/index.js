import { Router } from 'express';
import {
  getRecommendations,
  getSimilarSongs,
  getMoodRecommendations,
  getTrendingSongs,
  getUserStats,
  getUserTopSongs,
} from '../../controllers/recommendations/recommendations.controller.js';

const router = Router();

/**
 * @swagger
 * /recommendations:
 *   get:
 *     summary: Get personalized recommendations for a user
 *     description: Returns personalized song recommendations using hybrid ML algorithms
 *     tags: [Recommendations]
 *     responses:
 *       200:
 *         description: A list of recommended songs
 */
router.route('/').get(getRecommendations);

/**
 * @swagger
 * /recommendations/similar/:songId:
 *   get:
 *     summary: Get similar songs to a specific song
 *     tags: [Recommendations]
 */
router.route('/similar/:songId').get(getSimilarSongs);

/**
 * @swagger
 * /recommendations/mood/:mood:
 *   get:
 *     summary: Get mood-based recommendations
 *     tags: [Recommendations]
 */
router.route('/mood/:mood').get(getMoodRecommendations);

/**
 * @swagger
 * /recommendations/trending:
 *   get:
 *     summary: Get trending songs
 *     tags: [Recommendations]
 */
router.route('/trending').get(getTrendingSongs);

/**
 * @swagger
 * /recommendations/stats:
 *   get:
 *     summary: Get user listening stats
 *     tags: [Recommendations]
 */
router.route('/stats').get(getUserStats);

/**
 * @swagger
 * /recommendations/top:
 *   get:
 *     summary: Get user's top songs
 *     tags: [Recommendations]
 */
router.route('/top').get(getUserTopSongs);

export default router;
