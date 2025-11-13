import { successResponse, errorResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../../utils/constants.js";
import { getSupabaseClient } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";

// Hardcoded user ID for testing purposes until authentication is implemented
const TEST_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; 

/**
 * @description Get user preferences
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUserPreferences = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id || TEST_USER_ID; // Use authenticated user ID or test ID

  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      logger.error(`Error fetching user preferences for user ${userId}:`, error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    if (!data) {
      return successResponse(
        res,
        null,
        "User preferences not found",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return successResponse(
      res,
      data,
      "User preferences fetched successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error(`Error in getUserPreferences controller for user ${userId}:`, error);
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
 * @description Update or create user preferences
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateUserPreferences = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id || TEST_USER_ID; // Use authenticated user ID or test ID
  const preferences = req.body;

  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: userId, ...preferences }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      logger.error(`Error updating user preferences for user ${userId}:`, error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    return successResponse(
      res,
      data,
      "User preferences updated successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error(`Error in updateUserPreferences controller for user ${userId}:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

export { getUserPreferences, updateUserPreferences };
