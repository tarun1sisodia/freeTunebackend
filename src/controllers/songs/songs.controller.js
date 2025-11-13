import { successResponse, errorResponse, paginatedResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, PAGINATION } from "../../utils/constants.js";
import { getSupabaseClient } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";

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

    return paginatedResponse(
      res,
      data,
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

    return successResponse(res, data, "Song fetched successfully", HTTP_STATUS.OK);
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

export { getSongs, getSongById };
