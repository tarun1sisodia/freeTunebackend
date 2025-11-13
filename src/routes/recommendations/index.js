import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getRecommendations } from "../../controllers/recommendations/recommendations.controller.js";

const router = Router();

/**
 * @swagger
 * /recommendations:
 *   get:
 *     summary: Get recommendations for a user
 *     description: Responds with a list of recommended songs.
 *     tags: [Recommendations]
 *     responses:
 *       200:
 *         description: A list of recommended songs.
 */
router.route("/").get(asyncHandler(getRecommendations));

export default router;
