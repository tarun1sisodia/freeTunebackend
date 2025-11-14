import { Router } from 'express';
import {
  trackListening,
  getUserStats,
  getUserTopSongs,
  getUserTimePatterns,
  getUserGenrePreferences,
  getUserMoodPreferences,
  getTrendingSongs,
} from '../../controllers/analytics/analytics.controller.js';

const router = Router();

/**
 * @swagger
 * /analytics/track:
 *   post:
 *     summary: Track a listening event
 *     tags: [Analytics]
 */
router.route('/track').post(trackListening);

/**
 * @swagger
 * /analytics/stats:
 *   get:
 *     summary: Get user listening statistics
 *     tags: [Analytics]
 */
router.route('/stats').get(getUserStats);

/**
 * @swagger
 * /analytics/top-songs:
 *   get:
 *     summary: Get user's top songs
 *     tags: [Analytics]
 */
router.route('/top-songs').get(getUserTopSongs);

/**
 * @swagger
 * /analytics/time-patterns:
 *   get:
 *     summary: Get user's listening time patterns
 *     tags: [Analytics]
 */
router.route('/time-patterns').get(getUserTimePatterns);

/**
 * @swagger
 * /analytics/genre-preferences:
 *   get:
 *     summary: Get user's genre preferences
 *     tags: [Analytics]
 */
router.route('/genre-preferences').get(getUserGenrePreferences);

/**
 * @swagger
 * /analytics/mood-preferences:
 *   get:
 *     summary: Get user's mood preferences
 *     tags: [Analytics]
 */
router.route('/mood-preferences').get(getUserMoodPreferences);

/**
 * @swagger
 * /analytics/trending:
 *   get:
 *     summary: Get global trending songs
 *     tags: [Analytics]
 */
router.route('/trending').get(getTrendingSongs);

export default router;
