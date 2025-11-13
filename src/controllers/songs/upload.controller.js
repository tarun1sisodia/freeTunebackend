/**
 * Upload Controller
 * Handles song upload, metadata updates, and deletion using Cloudflare R2
 */

import { successResponse, errorResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../../utils/constants.js";
import { getSupabaseClient } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";
import fileUploadHelper from "../../services/audioUpload.js";

/**
 * @description Upload song to Cloudflare R2 and save metadata to database
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const uploadSong = async (req, res) => {
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

  if (!req.file) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Audio file is required",
    );
  }

  const { title, artist, album, duration_ms } = req.body;

  if (!title || !artist || !duration_ms) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Title, artist, and duration are required",
    );
  }

  try {
    fileUploadHelper.validateFile(req.file.mimetype, req.file.size);

    const fileKey = fileUploadHelper.generateFileKey(req.file.originalname);

    const uploadResult = await fileUploadHelper.uploadFile(
      req.file.buffer,
      fileKey,
      req.file.mimetype,
      {
        uploadedBy: userId,
        title,
        artist,
        album: album || null,
      }
    );

    const { data, error } = await supabase
      .from("songs")
      .insert({
        title: title.trim(),
        artist: artist.trim(),
        album: album?.trim() || null,
        duration_ms: parseInt(duration_ms, 10),
        r2_key: fileKey,
        file_sizes: {
          original: uploadResult.size,
        },
        play_count: 0,
        popularity_score: 0,
        metadata: {
          uploaded_by: userId,
          original_filename: req.file.originalname,
        },
      })
      .select()
      .single();

    if (error) {
      logger.error("Error saving song metadata:", error);
      await fileUploadHelper.deleteFile(fileKey);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      {
        song: data,
        upload: {
          size: uploadResult.size,
          key: fileKey,
          url: uploadResult.url,
        },
      },
      "Song uploaded successfully",
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    logger.error("Error in uploadSong controller:", error);
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
 * @description Update song metadata
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateSongMetadata = async (req, res) => {
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
  const { title, artist, album, duration_ms, metadata } = req.body;

  try {
    const { data: existing, error: checkError } = await supabase
      .from("songs")
      .select("id, metadata")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (artist !== undefined) updates.artist = artist.trim();
    if (album !== undefined) updates.album = album?.trim() || null;
    if (duration_ms !== undefined) updates.duration_ms = parseInt(duration_ms, 10);
    if (metadata !== undefined) {
      updates.metadata = {
        ...existing.metadata,
        ...metadata,
      };
    }

    const { data, error } = await supabase
      .from("songs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating song metadata:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      data,
      "Song metadata updated successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in updateSongMetadata controller:", error);
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
 * @description Delete song and its file from R2
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const deleteSong = async (req, res) => {
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
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, r2_key, metadata")
      .eq("id", id)
      .single();

    if (songError || !song) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const { error: deleteError } = await supabase
      .from("songs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("Error deleting song from database:", deleteError);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [deleteError.message],
      );
    }

    const fileDeleted = await fileUploadHelper.deleteFile(song.r2_key);
    if (!fileDeleted) {
      logger.warn(`Failed to delete file from R2: ${song.r2_key}`);
    }

    return successResponse(
      res,
      null,
      "Song deleted successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in deleteSong controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

export { uploadSong, updateSongMetadata, deleteSong };
