import { successResponse, errorResponse, paginatedResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, PAGINATION } from "../../utils/constants.js";
import { getSupabaseClient } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";
import { transformSong, transformArray } from "../../utils/modelTransformers.js";

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

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit - 1;

  try {
    const { data, error, count } = await supabase
      .from("songs")
      .select("*", { count: "exact" })
      .or(`title.ilike.%${q}%,artist.ilike.%${q}%,album.ilike.%${q}%`)
      .range(startIndex, endIndex);

    if (error) {
      logger.error("Error searching songs:", error);
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
      "Search completed successfully",
    );
  } catch (error) {
    logger.error("Error in searchSongs controller:", error);
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

    return successResponse(
      res,
      { songs, count: songs.length },
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
      const { error: deleteError } = await supabase
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
      const { error: insertError } = await supabase
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
  const { session_id, metadata = {} } = req.body;

  try {
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, play_count")
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

    const { error: updateError } = await supabase
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
