import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUserPreferences, updateUserPreferences } from "../../controllers/user/user.controller.js";

const router = Router();

/**
 * @swagger
 * /users/preferences:
 *   get:
 *     summary: Get user preferences
 *     description: Retrieves the preferences for the authenticated user.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully.
 *       404:
 *         description: User preferences not found.
 *   put:
 *     summary: Update user preferences
 *     description: Updates the preferences for the authenticated user. If preferences do not exist, they will be created.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferred_quality:
 *                 type: string
 *                 enum: [original, high, medium, low]
 *               auto_download:
 *                 type: boolean
 *               download_quality:
 *                 type: string
 *                 enum: [original, high, medium, low]
 *               data_saver_mode:
 *                 type: boolean
 *               theme:
 *                 type: string
 *                 enum: [light, dark, auto]
 *               language:
 *                 type: string
 *               explicit_content_filter:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User preferences updated successfully.
 *       500:
 *         description: Internal server error.
 */
router.route("/preferences").get(asyncHandler(getUserPreferences)).put(asyncHandler(updateUserPreferences));

export default router;
