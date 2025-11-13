/**
 * Playlist Routes
 * All playlist-related endpoints (CRUD, song management)
 */

import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authMiddleware } from "../../middleware/auth.js";

// Import controllers
import {
  getUserPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from "../../controllers/songs/playlist.controller.js";

const router = Router();

/**
 * Playlist CRUD Routes
 */

// GET /api/v1/playlists - Get user's playlists
router.get("/", authMiddleware, asyncHandler(getUserPlaylists));

// POST /api/v1/playlists - Create new playlist
router.post("/", authMiddleware, asyncHandler(createPlaylist));

// GET /api/v1/playlists/:id - Get single playlist by ID
router.get("/:id", authMiddleware, asyncHandler(getPlaylistById));

// PATCH /api/v1/playlists/:id - Update playlist details
router.patch("/:id", authMiddleware, asyncHandler(updatePlaylist));

// DELETE /api/v1/playlists/:id - Delete playlist
router.delete("/:id", authMiddleware, asyncHandler(deletePlaylist));

/**
 * Playlist Song Management Routes
 */

// POST /api/v1/playlists/:id/songs - Add song to playlist
router.post("/:id/songs", authMiddleware, asyncHandler(addSongToPlaylist));

// DELETE /api/v1/playlists/:id/songs/:songId - Remove song from playlist
router.delete(
  "/:id/songs/:songId",
  authMiddleware,
  asyncHandler(removeSongFromPlaylist)
);

export default router;
