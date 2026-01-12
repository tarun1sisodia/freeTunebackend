import { successResponse, errorResponse, paginatedResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, PAGINATION, CACHE_TTL } from "../../utils/constants.js";

import ApiError from "../../utils/apiError.js";
import { getSupabaseClient, getSupabaseAdmin } from "../../database/connections/supabase.js";
import { logger } from "../../utils/logger.js";
import { transformSong, transformArray } from "../../utils/modelTransformers.js";
import cacheHelper from "../../utils/cacheHelper.js";
import { ListeningPattern } from "../../database/models/index.js";

/**
 * @description Get a list of songs
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getSongs = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit - 1;

  try {
    const { data, error, count } = await supabase
      .from("songs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(startIndex, endIndex);

    if (error) {
      logger.error("Error fetching songs from Supabase:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    const transformedData = transformArray(data, transformSong);

    return paginatedResponse(
      res,
      transformedData,
      page,
      limit,
      count,
      "Songs fetched successfully",
    );
  } catch (error) {
    logger.error("Error in getSongs controller:", error);
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
 * @description Get a song by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getSongById = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const { id } = req.params;

  try {
    // Try cache first
    const cacheKey = `song:${id}`;
    const cached = await cacheHelper.get(cacheKey);

    if (cached) {
      logger.debug(`Cache HIT: song:${id}`);
      try {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return successResponse(
          res,
          parsed,
          "Song fetched from cache",
          HTTP_STATUS.OK,
        );
      } catch (e) {
        logger.warn(`Failed to parse cache for song:${id}, treating as miss`);
        await cacheHelper.del(cacheKey);
      }
    }

    logger.debug(`Cache MISS: song:${id}`);

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error(`Error fetching song with ID ${id} from Supabase:`, error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    if (!data) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const transformedData = transformSong(data);

    // Cache song data (1 hour TTL)
    await cacheHelper.set(cacheKey, JSON.stringify(transformedData), CACHE_TTL.HOT_SONGS);
    logger.debug(`Cache SET: song:${id} (TTL: ${CACHE_TTL.HOT_SONGS}s)`);

    return successResponse(res, transformedData, "Song fetched successfully", HTTP_STATUS.OK);
  } catch (error) {
    logger.error(`Error in getSongById controller for ID ${id}:`, error);
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
 * @description Search songs by title, artist, or album
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const searchSongs = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const { q } = req.query;
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT;

  if (!q || q.trim().length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Search query is required",
    );
  }

  // Sanitize query
  const sanitizedQuery = q.trim().slice(0, 100);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit - 1;

  try {
    // Generate cache key (normalize query)
    const normalizedQuery = sanitizedQuery.toLowerCase();
    const cacheKey = `search:${normalizedQuery}:page:${page}:limit:${limit}`;

    // Try cache first (only for first page)
    if (page === 1) {
      const cached = await cacheHelper.get(cacheKey);
      if (cached) {
        logger.info(`Cache HIT: Search results for "${q}"`);
        return res.json({
          success: true,
          data: cached.data,
          pagination: cached.pagination,
          message: "Search results fetched from cache",
          cached: true,
        });
      }
    }

    logger.debug(`Cache MISS: Searching for "${q}" in database`);

    // Create search promise
    const searchPromise = supabase
      .from("songs")
      .select("*", { count: "exact" })
      .or(`title.ilike.%${sanitizedQuery}%,artist.ilike.%${sanitizedQuery}%,album.ilike.%${sanitizedQuery}%`)
      .range(startIndex, endIndex);

    // Create timeout promise (10 seconds)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Search timeout')), 10000)
    );

    // Race them
    const { data, error, count } = await Promise.race([
      searchPromise,
      timeoutPromise
    ]);

    if (error) {
      logger.error("Error searching songs:", error);

      // Fallback: Return cached results even if stale
      const staleCache = await cacheHelper.get(cacheKey, { ignoreExpiry: true });
      if (staleCache) {
        logger.info(`Returning stale cache for "${q}" due to DB error`);
        return res.json({
          success: true,
          data: staleCache.data,
          pagination: staleCache.pagination,
          message: "Search results from cache (database unavailable)",
          cached: true,
          stale: true,
        });
      }

      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    const transformedData = transformArray(data, transformSong);

    // --- FALLBACK LOGIC: If no songs found, Trigger yt-dlp ---
    if (count === 0 && page === 1) {
      logger.info(`No results found for "${q}". Triggering yt-dlp Fallback.`);

      // Import Queue Service dynamically to avoid circular issues if any, or just standard import at top
      const queueService = (await import('../../services/queue.service.js')).default;

      // Check if we already have a pending job for this query to avoid spam
      // Use a Redis lock/flag to prevent duplicate jobs for the same query
      const lockKey = `job:lock:search:${normalizedQuery}`;
      const isLocked = await cacheHelper.exists(lockKey);

      if (isLocked) {
        logger.info(`Job already pending for "${sanitizedQuery}", skipping duplicate trigger.`);
        // Return without triggering new job
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          message: "Search is being processed in background. Please check back shortly.",
          background_job_initiated: true
        });
      }

      try {
        await queueService.addDownloadJob({
          query: sanitizedQuery,
          userId: req.user?.id || 'anonymous',
          source: 'ondemand_search'
        });

        // Set lock for 5 minutes (average job time?)
        // If it fails, lock expires. If it succeeds, listener could potentially clear it,
        // or we just let it expire to act as a cooldown.
        await cacheHelper.set(lockKey, 'processing', 300);

        // Return a special status? Or just empty list with a message?
        // "Accepted" (202) is technically correct for background processing,
        // but frontend expects list. Let's return empty list but with a specific status flag.
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          },
          message: "No songs found. A background search has been initiated. Please check back shortly.",
          background_job_initiated: true
        });

      } catch (queueError) {
        logger.error('Failed to trigger background download:', queueError);
        // Fallthrough to return empty list
      }
    }
    // ---------------------------------------------------------

    // Cache first page results
    if (page === 1 && transformedData.length > 0) {
      const cacheData = {
        data: transformedData,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
      await cacheHelper.set(cacheKey, cacheData, CACHE_TTL.SEARCH_RESULTS);
      logger.info(`Cached search results for "${q}" (TTL: ${CACHE_TTL.SEARCH_RESULTS}s)`);
    }

    return paginatedResponse(
      res,
      transformedData,
      page,
      limit,
      count,
      "Search completed successfully",
    );
  } catch (error) {
    logger.error("Error in searchSongs controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle timeout specifically if possible, or generic
    if (error.message === 'Search timeout') {
      throw new ApiError(
        HTTP_STATUS.GATEWAY_TIMEOUT,
        "Search request timed out. Please try again.",
      );
    }

    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
      [error.message]
    );
  }
};

/**
 * @description Get user's recently played songs
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getRecentlyPlayed = async (req, res) => {
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

  const limit = parseInt(req.query.limit, 10) || 20;

  try {
    // Try cache first
    const cacheKey = `user:recent:${userId}`;
    const cached = await cacheHelper.get(cacheKey);

    if (cached) {
      logger.debug(`Cache HIT: ${cacheKey}`);
      try {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return successResponse(
          res,
          parsed,
          "Recently played songs fetched from cache",
          HTTP_STATUS.OK,
        );
      } catch (e) {
        logger.warn(`Failed to parse cache for ${cacheKey}, treating as miss`);
        await cacheHelper.del(cacheKey);
      }
    }

    logger.debug(`Cache MISS: ${cacheKey}`);

    const { data, error } = await supabase
      .from("user_interactions")
      .select("song_id, created_at, songs(*)")
      .eq("user_id", userId)
      .eq("action_type", "play")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Safely handle error message
      const errorMsg = error.message ? error.message : "Unknown database error";
      logger.error("Error fetching recently played:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)],
      );
    }

    // Filter out items where 'songs' is null (deleted songs) and transform
    const seenSongIds = new Set();
    const validSongs = [];

    for (const item of (data || [])) {
      if (item && item.songs && !seenSongIds.has(item.song_id)) {
        seenSongIds.add(item.song_id);
        const transformed = transformSong(item.songs);
        validSongs.push({
          ...transformed,
          played_at: item.created_at,
        });
      }
    }

    const responseData = { songs: validSongs, count: validSongs.length };

    // Cache recently played (7 days TTL)
    await cacheHelper.set(cacheKey, responseData, CACHE_TTL.USER_RECENT);
    logger.debug(`Cache SET: ${cacheKey} (TTL: ${CACHE_TTL.USER_RECENT}s)`);

    return successResponse(
      res,
      responseData,
      "Recently played songs fetched successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in getRecentlyPlayed controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }

    // Safety check for error message to avoid "[object Object]" logs
    const msg = error.message || "Unknown internal error";
    const safeMsg = typeof msg === 'object' ? JSON.stringify(msg) : msg;

    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
      [safeMsg]
    );
  }
};

/**
 * @description Get user's favorite songs
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getFavorites = async (req, res) => {
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
  const limit = parseInt(req.query.limit, 10) || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit - 1;

  try {
    const { data, error, count } = await supabase
      .from("user_interactions")
      .select("song_id, created_at, songs(*)", { count: "exact" })
      .eq("user_id", userId)
      .eq("action_type", "like")
      .order("created_at", { ascending: false })
      .range(startIndex, endIndex);

    if (error) {
      const errorMsg = error.message ? error.message : "Unknown database error";
      logger.error("Error fetching favorites:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)],
      );
    }

    // Filter out items where 'songs' is null (deleted songs) and transform
    const songs = (data || [])
      .filter((item) => item && item.songs)
      .map((item) => {
        const transformed = transformSong(item.songs);
        return {
          ...transformed,
          liked_at: item.created_at, // Keep snake_case
        };
      });

    return paginatedResponse(
      res,
      songs,
      page,
      limit,
      count,
      "Favorite songs fetched successfully",
    );
  } catch (error) {
    logger.error("Error in getFavorites controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }

    const msg = error.message || "Unknown internal error";
    const safeMsg = typeof msg === 'object' ? JSON.stringify(msg) : msg;

    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
      [safeMsg]
    );
  }
};

/**
 * @description Toggle favorite (add/remove from favorites)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const toggleFavorite = async (req, res) => {
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

  try {
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id")
      .eq("id", songId)
      .single();

    if (songError || !song) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const { data: existing, error: checkError } = await supabase
      .from("user_interactions")
      .select("id")
      .eq("user_id", userId)
      .eq("song_id", songId)
      .eq("action_type", "like")
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      logger.error("Error checking favorite:", checkError);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [checkError.message],
      );
    }

    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from("user_interactions")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        logger.error("Error removing favorite:", deleteError);
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.OPERATION_FAILED,
          [deleteError.message],
        );
      }

      return successResponse(
        res,
        { isFavorite: false },
        "Removed from favorites",
        HTTP_STATUS.OK,
      );
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("user_interactions")
        .insert({
          user_id: userId,
          song_id: songId,
          action_type: "like",
        });

      if (insertError) {
        logger.error("Error adding favorite:", insertError);
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.OPERATION_FAILED,
          [insertError.message],
        );
      }

      return successResponse(
        res,
        { isFavorite: true },
        "Added to favorites",
        HTTP_STATUS.CREATED,
      );
    }
  } catch (error) {
    logger.error("Error in toggleFavorite controller:", error);
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
 * @description Track song play
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const trackPlay = async (req, res) => {



  const { id: songId } = req.params;
  const { session_id, metadata = {} } = req.body;

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  // Use Admin client to bypass RLS for server-side recording
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase admin client not initialized"],
    );
  }

  try {
    const { data: song, error: songError } = await supabaseAdmin
      .from("songs")
      .select("id, play_count")
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
        metadata,
      });

    if (interactionError) {
      logger.error("Error recording play:", interactionError);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [interactionError.message],
      );
    }

    // --- MongoDB Analytics (ListeningPattern) ---
    try {
      // Create listening pattern without awaiting to avoid blocking response
      // or await if consistentcy is critical. For analytics, fire-and-forget or safe await is fine.
      // We'll await safely to catch errors but not block the main flow significantly.
      await ListeningPattern.create({
        userId,
        songId,
        playDuration: metadata.duration || 0, // Duration in seconds or ms? Schema says Number. Assuming payload sends safe data.
        completionRate: metadata.completionRate || 0, // 0-1
        source: metadata.source || 'playlist',
        deviceType: metadata.deviceType || 'mobile',
        networkType: metadata.networkType || 'wifi',
        quality: metadata.quality || 'high',
        timestamp: new Date(),
        sessionId: session_id,
        skipped: metadata.skipped || false
      });
      logger.debug(`Recorded ListeningPattern for song ${songId}`);
    } catch (mongoError) {
      // Don't fail the request if analytics fail, just log it
      logger.error("Error recording ListeningPattern:", mongoError);
    }
    // --------------------------------------------

    const { error: updateError } = await supabaseAdmin
      .from("songs")
      .update({
        play_count: song.play_count + 1,
        last_updated: new Date().toISOString(),
      })
      .eq("id", songId);

    if (updateError) {
      logger.warn("Failed to update play count:", updateError);
    }

    return successResponse(
      res,
      null,
      "Play tracked successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in trackPlay controller:", error);
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
 * @description Get popular/trending songs
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getPopularSongs = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit - 1;

  try {
    // Cache key for popular songs (page-specific)
    const cacheKey = `popular:songs:page:${page}:limit:${limit}`;

    // Try cache first (only for first page for simplicity)
    if (page === 1) {
      const cached = await cacheHelper.get(cacheKey);
      if (cached) {
        logger.info(`Cache HIT: Popular songs page ${page}`);
        return res.json({
          success: true,
          data: cached.data,
          pagination: cached.pagination,
          message: "Popular songs fetched from cache",
          cached: true,
        });
      }
    }

    logger.debug(`Cache MISS: Fetching popular songs page ${page} from DB`);

    const { data, error, count } = await supabase
      .from("songs")
      .select("*", { count: "exact" })
      .order("popularity_score", { ascending: false })
      .order("play_count", { ascending: false })
      .range(startIndex, endIndex);

    if (error) {
      logger.error("Error fetching popular songs:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    // Cache first page results
    if (page === 1 && data.length > 0) {
      const cacheData = {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
      await cacheHelper.set(cacheKey, cacheData, CACHE_TTL.HOT_SONGS);
      logger.info(`Cached popular songs page ${page} (TTL: ${CACHE_TTL.HOT_SONGS}s)`);
    }

    return paginatedResponse(
      res,
      data,
      page,
      limit,
      count,
      "Popular songs fetched successfully",
    );
  } catch (error) {
    logger.error("Error in getPopularSongs controller:", error);
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
  getSongs,
  getSongById,
  searchSongs,
  getRecentlyPlayed,
  getFavorites,
  toggleFavorite,
  trackPlay,
  getPopularSongs,
};
