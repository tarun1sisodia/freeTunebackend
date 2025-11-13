/**
 * Playlist Controller
 * Handles playlist CRUD operations and song management
 */

import { successResponse, errorResponse, paginatedResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, PAGINATION } from "../../utils/constants.js";
import { getSupabaseClient } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";

/**
 * @description Get user's playlists
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUserPlaylists = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit - 1;

  try {
    const { data, error, count } = await supabase
      .from("playlists")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(startIndex, endIndex);

    if (error) {
      logger.error("Error fetching playlists:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return paginatedResponse(
      res,
      data,
      page,
      limit,
      count,
      "Playlists fetched successfully",
    );
  } catch (error) {
    logger.error("Error in getUserPlaylists controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Get single playlist by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getPlaylistById = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Playlist not found",
      );
    }

    if (data.user_id !== userId && !data.is_public) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You don't have permission to access this playlist",
      );
    }

    if (data.song_ids && data.song_ids.length > 0) {
      const { data: songs, error: songsError } = await supabase
        .from("songs")
        .select("*")
        .in("id", data.song_ids);

      if (!songsError) {
        data.songs = songs;
      }
    }

    return successResponse(
      res,
      data,
      "Playlist fetched successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in getPlaylistById controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Create new playlist
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const createPlaylist = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const { name, description, is_public = false } = req.body;

  if (!name || name.trim().length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Playlist name is required",
    );
  }

  try {
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        is_public,
        song_ids: [],
        auto_generated: false,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating playlist:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      data,
      "Playlist created successfully",
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    logger.error("Error in createPlaylist controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Update playlist details
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updatePlaylist = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const { id } = req.params;
  const { name, description, is_public } = req.body;

  try {
    const { data: existing, error: checkError } = await supabase
      .from("playlists")
      .select("user_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Playlist not found",
      );
    }

    if (existing.user_id !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You don't have permission to update this playlist",
      );
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (is_public !== undefined) updates.is_public = is_public;

    const { data, error } = await supabase
      .from("playlists")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating playlist:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      data,
      "Playlist updated successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in updatePlaylist controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Delete playlist
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const deletePlaylist = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const { id } = req.params;

  try {
    const { data: existing, error: checkError } = await supabase
      .from("playlists")
      .select("user_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Playlist not found",
      );
    }

    if (existing.user_id !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You don't have permission to delete this playlist",
      );
    }

    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error deleting playlist:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      null,
      "Playlist deleted successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in deletePlaylist controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Add song to playlist
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const addSongToPlaylist = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const { id } = req.params;
  const { song_id } = req.body;

  if (!song_id) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Song ID is required",
    );
  }

  try {
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("user_id, song_ids")
      .eq("id", id)
      .single();

    if (playlistError || !playlist) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Playlist not found",
      );
    }

    if (playlist.user_id !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You don't have permission to modify this playlist",
      );
    }

    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id")
      .eq("id", song_id)
      .single();

    if (songError || !song) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SONG_NOT_FOUND,
      );
    }

    const currentSongIds = playlist.song_ids || [];
    if (currentSongIds.includes(song_id)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Song already in playlist",
      );
    }

    const updatedSongIds = [...currentSongIds, song_id];

    const { data, error } = await supabase
      .from("playlists")
      .update({ song_ids: updatedSongIds })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error adding song to playlist:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      data,
      "Song added to playlist successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in addSongToPlaylist controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Remove song from playlist
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const removeSongFromPlaylist = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const { id, songId } = req.params;

  try {
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("user_id, song_ids")
      .eq("id", id)
      .single();

    if (playlistError || !playlist) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Playlist not found",
      );
    }

    if (playlist.user_id !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You don't have permission to modify this playlist",
      );
    }

    const currentSongIds = playlist.song_ids || [];
    if (!currentSongIds.includes(songId)) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Song not found in playlist",
      );
    }

    const updatedSongIds = currentSongIds.filter((id) => id !== songId);

    const { data, error } = await supabase
      .from("playlists")
      .update({ song_ids: updatedSongIds })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error removing song from playlist:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      data,
      "Song removed from playlist successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in removeSongFromPlaylist controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

export {
  getUserPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
};
