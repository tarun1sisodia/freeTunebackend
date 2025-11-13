/**
 * Songs Routes
 * All song-related endpoints (CRUD, search, favorites, streaming, upload)
 */

import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authMiddleware } from "../../middleware/auth.js";

// Import controllers
import {
  getSongs,
  getSongById,
  searchSongs,
  getRecentlyPlayed,
  getFavorites,
  toggleFavorite,
  trackPlay,
  getPopularSongs,
} from "../../controllers/songs/songs.controller.js";

import {
  uploadSong,
  updateSongMetadata,
  deleteSong,
} from "../../controllers/songs/upload.controller.js";

import {
  getStreamUrl,
  streamSong,
  trackPlayback,
  getFileMetadata,
} from "../../controllers/songs/stream.controller.js";

const router = Router();

// Configure multer for file uploads (memory storage for R2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

/**
 * Public/Authenticated Song Routes
 */

// GET /api/v1/songs - Get all songs (paginated)
router.get("/", authMiddleware, asyncHandler(getSongs));

// GET /api/v1/songs/search - Search songs
router.get("/search", authMiddleware, asyncHandler(searchSongs));

// GET /api/v1/songs/popular - Get popular/trending songs
router.get("/popular", authMiddleware, asyncHandler(getPopularSongs));

// GET /api/v1/songs/recently-played - Get user's recently played
router.get("/recently-played", authMiddleware, asyncHandler(getRecentlyPlayed));

// GET /api/v1/songs/favorites - Get user's favorite songs
router.get("/favorites", authMiddleware, asyncHandler(getFavorites));

// GET /api/v1/songs/:id - Get single song by ID
router.get("/:id", authMiddleware, asyncHandler(getSongById));

/**
 * Upload & Management Routes
 */

// POST /api/v1/songs/upload - Upload new song to R2
router.post(
  "/upload",
  authMiddleware,
  upload.single("audio"),
  asyncHandler(uploadSong)
);

// PATCH /api/v1/songs/:id/metadata - Update song metadata
router.patch("/:id/metadata", authMiddleware, asyncHandler(updateSongMetadata));

// DELETE /api/v1/songs/:id - Delete song
router.delete("/:id", authMiddleware, asyncHandler(deleteSong));

/**
 * Streaming Routes
 */

// GET /api/v1/songs/:id/stream-url - Get presigned streaming URL
router.get("/:id/stream-url", authMiddleware, asyncHandler(getStreamUrl));

// GET /api/v1/songs/:id/stream - Stream song directly (redirect)
router.get("/:id/stream", authMiddleware, asyncHandler(streamSong));

// GET /api/v1/songs/:id/file-info - Get R2 file metadata
router.get("/:id/file-info", authMiddleware, asyncHandler(getFileMetadata));

/**
 * Interaction Routes
 */

// POST /api/v1/songs/:id/favorite - Toggle favorite
router.post("/:id/favorite", authMiddleware, asyncHandler(toggleFavorite));

// POST /api/v1/songs/:id/play - Track play
router.post("/:id/play", authMiddleware, asyncHandler(trackPlay));

// POST /api/v1/songs/:id/playback - Track playback progress
router.post("/:id/playback", authMiddleware, asyncHandler(trackPlayback));

export default router;
