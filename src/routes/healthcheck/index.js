import { Router } from "express";
import { getHealthCheck } from "../../controllers/healthcheck/healthcheck.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

/**
 * @swagger
 * /healthcheck:
 *   get:
 *     summary: Check API health
 *     description: Responds with the server's status and uptime.
 *     tags: [Healthcheck]
 *     responses:
 *       200:
 *         description: API is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 uptime:
 *                   type: number
 *                   example: 123.45
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.route("/").get(asyncHandler(getHealthCheck));

export default router;
