/**
 * Stream Controller
 * Handles audio streaming via Cloudflare R2 presigned URLs
 * with Redis caching for performance
 */

import { successResponse, errorResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, CACHE_TTL, CACHE_KEYS } from "../../utils/constants.js";
import { getSupabaseClient } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";
import fileUploadHelper from "../../services/audioUpload.js";
import cacheHelper from "../../utils/cacheHelper.js";

/**
 * @description Get presigned URL for streaming a song
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getStreamUrl = async (req, res) => {
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
  const { quality = "high" } = req.query;

  try {
    // Generate cache key for this specific song and quality
    const cacheKey = CACHE_KEYS.CDN_URL(id, quality);
    
    // Try to get from cache first
    const cachedUrl = await cacheHelper.get(cacheKey);
    
    if (cachedUrl) {
      logger.info(`Cache HIT: Stream URL for song ${id} (${quality})`);
      return successResponse(
        res,
        {
          streamUrl: cachedUrl,
          song: {
            id,
          },
          quality,
          expiresIn: await cacheHelper.ttl(cacheKey),
          cached: true,
        },
        "Stream URL retrieved from cache",
        HTTP_STATUS.OK,
      );
    }

    logger.debug(`Cache MISS: Generating new stream URL for song ${id}`);

    // Cache miss - fetch from database
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, r2_key, title, artist, file_sizes")
      .eq("id", id)
      .single();

    if (songError || !song) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    // Check if file exists in R2
    const fileExists = await fileUploadHelper.fileExists(song.r2_key);
    if (!fileExists) {
      logger.error(`File not found in R2: ${song.r2_key}`);
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Audio file not found in storage",
      );
    }

    // Generate signed URL (expires in 30 minutes)
    const signedUrl = await fileUploadHelper.getSignedUrl(song.r2_key, 1800);

    // Cache the URL for 25 minutes (before it expires)
    await cacheHelper.set(cacheKey, signedUrl, CACHE_TTL.CDN_URLS);
    logger.info(`Cached stream URL for song ${id} (TTL: ${CACHE_TTL.CDN_URLS}s)`);

    return successResponse(
      res,
      {
        streamUrl: signedUrl,
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
        },
        quality,
        expiresIn: 1800,
        cached: false,
      },
      "Stream URL generated successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in getStreamUrl controller:", error);
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
 * @description Stream song directly (alternative to presigned URL)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const streamSong = async (req, res) => {
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
  const { quality = "high" } = req.query;

  try {
    // Generate cache key
    const cacheKey = CACHE_KEYS.CDN_URL(id, quality);
    
    // Try cache first
    const cachedUrl = await cacheHelper.get(cacheKey);
    
    if (cachedUrl) {
      logger.info(`Cache HIT: Direct stream for song ${id}`);
      return res.redirect(cachedUrl);
    }

    logger.debug(`Cache MISS: Generating direct stream URL for song ${id}`);

    // Cache miss - fetch from database
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, r2_key")
      .eq("id", id)
      .single();

    if (songError || !song) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    // Generate signed URL
    const signedUrl = await fileUploadHelper.getSignedUrl(song.r2_key, 1800);

    // Cache it
    await cacheHelper.set(cacheKey, signedUrl, CACHE_TTL.CDN_URLS);
    logger.info(`Cached direct stream URL for song ${id}`);

    res.redirect(signedUrl);
  } catch (error) {
    logger.error("Error in streamSong controller:", error);
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
 * @description Track playback progress and completion
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const trackPlayback = async (req, res) => {
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

  const { id: songId } = req.params;
  const {
    progress_ms,
    duration_ms,
    completed = false,
    session_id,
    quality,
    device_type,
  } = req.body;

  try {
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id")
      .eq("id", songId)
      .single();

    if (songError || !song) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const { error: interactionError } = await supabase
      .from("user_interactions")
      .insert({
        user_id: userId,
        song_id: songId,
        action_type: "play",
        session_id,
        metadata: {
          progress_ms,
          duration_ms,
          completed,
          quality,
          device_type,
          timestamp: new Date().toISOString(),
        },
      });

    if (interactionError) {
      logger.error("Error tracking playback:", interactionError);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [interactionError.message],
      );
    }

    return successResponse(
      res,
      {
        tracked: true,
        progress_ms,
        completed,
      },
      "Playback tracked successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in trackPlayback controller:", error);
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
 * @description Get file metadata from R2
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getFileMetadata = async (req, res) => {
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
      .select("id, r2_key, title, artist")
      .eq("id", id)
      .single();

    if (songError || !song) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const fileMetadata = await fileUploadHelper.getFileMetadata(song.r2_key);

    return successResponse(
      res,
      {
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
        },
        file: fileMetadata,
      },
      "File metadata retrieved successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in getFileMetadata controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

export { getStreamUrl, streamSong, trackPlayback, getFileMetadata };
