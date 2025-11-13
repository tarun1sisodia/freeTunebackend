import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getSongs, getSongById } from "../../controllers/songs/songs.controller.js";

const router = Router();

/**
 * @swagger
 * /songs:
 *   get:
 *     summary: Get a list of songs
 *     description: Responds with a list of songs.
 *     tags: [Songs]
 *     responses:
 *       200:
 *         description: A list of songs.
 */
router.route("/").get(asyncHandler(getSongs));

/**
 * @swagger
 * /songs/{id}:
 *   get:
 *     summary: Get a song by ID
 *     description: Responds with a single song.
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: A single song.
 *       404:
 *         description: Song not found.
 */
router.route("/:id").get(asyncHandler(getSongById));

export default router;
