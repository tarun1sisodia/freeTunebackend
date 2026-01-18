/**
 * Stream Controller
 * Handles audio streaming via Cloudflare R2 presigned URLs
 * with Redis caching for performance
 */

import { successResponse, errorResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, CACHE_TTL, CACHE_KEYS } from "../../utils/constants.js";
import { getSupabaseClient, getSupabaseAdmin } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";
import fileUploadHelper from "../../services/audioUpload.js";
import cacheHelper from "../../utils/cacheHelper.js";
import { triggerDownload } from "../../queues/download.queue.js";
import config from "../../config/index.js";
import { ListeningPattern, SongFeature } from "../../database/models/index.js";

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
    // Smart check: If r2_key ends with an audio extension, treat as direct file.
    // Otherwise, assume it's an HLS directory and look for master.m3u8.
    let fileKey = song.r2_key;
    const isDirectFile = /\.(mp3|m4a|wav|flac|ogg)$/i.test(song.r2_key);

    if (!isDirectFile && !song.r2_key.endsWith('.m3u8')) {
      fileKey = `${song.r2_key}/master.m3u8`;
    }

    // Skip expensive file existence check on R2 to reduce latency.
    // We trust the database record. If the file is missing, the CDN or signed URL will 404,
    // which is the standard behavior effectively.
    // const fileExists = await fileUploadHelper.fileExists(fileKey);
    // if (!fileExists) { ... }

    // Check if we can use Public URL (Preferred for HLS to avoid signature issues on segments)
    const publicUrlBase = config.r2.publicUrl;
    if (publicUrlBase && !isDirectFile) {
      // For HLS, returning the public URL of the master playlist is safer
      // because relative links inside will resolve correctly against the public domain.
      const publicStreamUrl = `${publicUrlBase}/${fileKey}`;
      logger.info(`Using Public URL for stream: ${publicStreamUrl}`);

      return successResponse(
        res,
        {
          streamUrl: publicStreamUrl,
          song: {
            id: song.id,
            title: song.title,
            artist: song.artist,
          },
          quality,
          expiresIn: null, // Public URLs don't expire
          cached: false,
        },
        "Stream URL generated successfully",
        HTTP_STATUS.OK,
      );
    }

    // Generate signed URL (expires in 30 minutes)
    const signedUrl = await fileUploadHelper.getSignedUrl(fileKey, 1800);

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

    // Check availability first
    let fileKey = song.r2_key;
    const isDirectFile = /\.(mp3|m4a|wav|flac|ogg)$/i.test(song.r2_key);

    if (!isDirectFile && !song.r2_key.endsWith('.m3u8')) {
      fileKey = `${song.r2_key}/master.m3u8`;
    }

    const fileExists = await fileUploadHelper.fileExists(fileKey);
    if (!fileExists) {
      logger.warn(`Direct stream: File missing ${fileKey}. Triggering download.`);
      await triggerDownload({
        query: `${song.title || 'Unknown Song'} ${song.artist || ''} audio`,
        songId: song.id,
      });
      // Return 404 with standard message for browser/player to handle
      return res.status(HTTP_STATUS.NOT_FOUND).send("Content restoring... please refresh shortly.");
    }

    // Generate signed URL or use Public URL
    let finalUrl;
    const publicUrlBase = config.r2.publicUrl;

    if (publicUrlBase && !isDirectFile) {
      finalUrl = `${publicUrlBase}/${fileKey}`;
      logger.info(`Redirecting to Public URL: ${finalUrl}`);
    } else {
      finalUrl = await fileUploadHelper.getSignedUrl(fileKey, 1800);
      // Cache it
      await cacheHelper.set(cacheKey, finalUrl, CACHE_TTL.CDN_URLS);
      logger.info(`Cached direct stream URL for song ${id}`);
    }

    res.redirect(finalUrl);
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
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabase || !supabaseAdmin) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client(s) not initialized"],
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

    const { error: interactionError } = await supabaseAdmin
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

    // --- MongoDB Analytics (ListeningPattern) ---
    // Record if completed OR significant play (>30s)
    if (userId) {
      const isLongPlay = progress_ms > 30000;

      try {
        let shouldRecord = false;

        if (completed) {
          shouldRecord = true;
        } else if (isLongPlay) {
          // Check if we already recorded a "valid listen" for this song recently to avoid spam
          const debounceKey = `analytics:recorded:${userId}:${songId}`;
          const alreadyRecorded = await cacheHelper.get(debounceKey);

          if (!alreadyRecorded) {
            shouldRecord = true;
            // Set debounce for 10 minutes (prevents duplicate 30s records for same session)
            await cacheHelper.set(debounceKey, 'true', 600);
          }
        }

        if (shouldRecord) {
          await ListeningPattern.create({
            userId,
            songId,
            playDuration: (duration_ms || 0) / 1000, // Seconds
            completionRate: duration_ms > 0 ? Math.min(progress_ms / duration_ms, 1) : 0,
            skipped: !completed, // If not completed event, assume skipped/stopped
            source: 'playlist', // Default, as frontend doesn't send source yet
            timestamp: new Date(),
            deviceType: device_type || 'mobile',
            quality: quality || 'high'
          });
          logger.debug(`Recorded ListeningPattern (completed=${completed}) for song ${songId}`);

          // Also update SongFeature metrics asynchronously
          // We can fire-and-forget this
          SongFeature.updateMetricsFromPatterns(songId, [{
            userId,
            completionRate: duration_ms > 0 ? Math.min(progress_ms / duration_ms, 1) : 0,
            skipped: !completed,
            liked: false, // We check likes separately
            addedToPlaylist: false
          }]).catch(err => logger.error("Error updating SongFeature metrics:", err));
        }
      } catch (mongoError) {
        logger.error("Error recording ListeningPattern in playback:", mongoError);
      }
    }
    // --------------------------------------------

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
