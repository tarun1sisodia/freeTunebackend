import { successResponse, errorResponse, paginatedResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, PAGINATION, CACHE_TTL } from "../../utils/constants.js";

import ApiError from "../../utils/apiError.js";
import { getSupabaseClient, getSupabaseAdmin } from "../../database/connections/supabase.js";
import { logger } from "../../utils/logger.js";
import { transformSong, transformArray } from "../../utils/modelTransformers.js";
import cacheHelper from "../../utils/cacheHelper.js";

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
      return successResponse(
        res,
        JSON.parse(cached),
        "Song fetched from cache",
        HTTP_STATUS.OK,
      );
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
      return successResponse(
        res,
        JSON.parse(cached),
        "Recently played songs fetched from cache",
        HTTP_STATUS.OK,
      );
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
      logger.error("Error fetching recently played:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }
    // We need to test how much is best or not.
    const songs = data.map((item) => ({
      ...item.songs,
      played_at: item.created_at,
    }));

    const responseData = { songs, count: songs.length };

    // Cache recently played (7 days TTL)
    await cacheHelper.set(cacheKey, JSON.stringify(responseData), CACHE_TTL.USER_RECENT);
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
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
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
      logger.error("Error fetching favorites:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    const songs = data.map((item) => ({
      ...item.songs,
      liked_at: item.created_at,
    }));

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
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
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
