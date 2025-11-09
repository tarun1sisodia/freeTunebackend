/**
 * Common Validation Functions
 * Reusable validation utilities for the application
 */

import { z } from "zod";
import { LIMITS, REGEX, AUDIO_QUALITIES } from "../utils/constants.js";
import ApiError from "../utils/apiError.js";

/**
 * Validate UUID format
 * @param {string} value - UUID string
 * @returns {boolean} Is valid UUID
 */
const isValidUUID = value => {
  return REGEX.UUID.test(value);
};

/**
 * Validate email format
 * @param {string} email - Email string
 * @returns {boolean} Is valid email
 */
const isValidEmail = email => {
  return REGEX.EMAIL.test(email);
};

/**
 * Validate URL format
 * @param {string} url - URL string
 * @returns {boolean} Is valid URL
 */
const isValidUrl = url => {
  return REGEX.URL.test(url);
};

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
const sanitizeString = input => {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>]/g, "");
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Validated pagination params
 */
const validatePagination = (page, limit) => {
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || LIMITS.PAGINATION_DEFAULT_LIMIT;

  return {
    page: Math.max(1, parsedPage),
    limit: Math.min(LIMITS.PAGINATION_MAX_LIMIT, Math.max(1, parsedLimit)),
  };
};

/**
 * Validate audio quality
 * @param {string} quality - Quality string
 * @returns {string} Valid quality or default
 */
const validateQuality = quality => {
  const validQualities = Object.values(AUDIO_QUALITIES);
  return validQualities.includes(quality) ? quality : AUDIO_QUALITIES.HIGH;
};

// ============================================================================
// ZOD SCHEMAS for common validations
// ============================================================================

/**
 * UUID Schema
 */
const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Email Schema
 */
const emailSchema = z.string().email("Invalid email format");

/**
 * Password Schema (min 8 chars, at least one letter and one number)
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Pagination Schema
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIMITS.PAGINATION_MAX_LIMIT)
    .optional()
    .default(LIMITS.PAGINATION_DEFAULT_LIMIT),
});

/**
 * Search Query Schema
 */
const searchQuerySchema = z
  .string()
  .min(
    LIMITS.SEARCH_QUERY_MIN,
    `Search query must be at least ${LIMITS.SEARCH_QUERY_MIN} characters`,
  )
  .max(
    LIMITS.SEARCH_QUERY_MAX,
    `Search query must not exceed ${LIMITS.SEARCH_QUERY_MAX} characters`,
  )
  .transform(val => sanitizeString(val));

/**
 * Audio Quality Schema
 */
const audioQualitySchema = z
  .enum([
    AUDIO_QUALITIES.ORIGINAL,
    AUDIO_QUALITIES.HIGH,
    AUDIO_QUALITIES.MEDIUM,
    AUDIO_QUALITIES.LOW,
    AUDIO_QUALITIES.PREVIEW,
  ])
  .optional()
  .default(AUDIO_QUALITIES.HIGH);

/**
 * Song Title Schema
 */
const songTitleSchema = z
  .string()
  .min(1, "Title is required")
  .max(
    LIMITS.SONG_TITLE_MAX,
    `Title must not exceed ${LIMITS.SONG_TITLE_MAX} characters`,
  )
  .transform(val => sanitizeString(val));

/**
 * Artist Name Schema
 */
const artistNameSchema = z
  .string()
  .min(1, "Artist name is required")
  .max(
    LIMITS.ARTIST_NAME_MAX,
    `Artist name must not exceed ${LIMITS.ARTIST_NAME_MAX} characters`,
  )
  .transform(val => sanitizeString(val));

/**
 * Album Name Schema
 */
const albumNameSchema = z
  .string()
  .max(
    LIMITS.ALBUM_NAME_MAX,
    `Album name must not exceed ${LIMITS.ALBUM_NAME_MAX} characters`,
  )
  .optional()
  .transform(val => (val ? sanitizeString(val) : undefined));

/**
 * Genre Schema
 */
const genreSchema = z
  .string()
  .max(LIMITS.GENRE_MAX, `Genre must not exceed ${LIMITS.GENRE_MAX} characters`)
  .optional()
  .transform(val => (val ? sanitizeString(val) : undefined));

/**
 * Duration Schema (in milliseconds)
 */
const durationSchema = z.coerce
  .number()
  .int()
  .positive("Duration must be positive");

/**
 * Year Schema
 */
const yearSchema = z.coerce
  .number()
  .int()
  .min(1900, "Year must be 1900 or later")
  .max(new Date().getFullYear() + 1, "Year cannot be in the future")
  .optional();

/**
 * Playlist Name Schema
 */
const playlistNameSchema = z
  .string()
  .min(1, "Playlist name is required")
  .max(
    LIMITS.PLAYLIST_NAME_MAX,
    `Playlist name must not exceed ${LIMITS.PLAYLIST_NAME_MAX} characters`,
  )
  .transform(val => sanitizeString(val));

/**
 * Playlist Description Schema
 */
const playlistDescriptionSchema = z
  .string()
  .max(
    LIMITS.PLAYLIST_DESCRIPTION_MAX,
    `Description must not exceed ${LIMITS.PLAYLIST_DESCRIPTION_MAX} characters`,
  )
  .optional()
  .transform(val => (val ? sanitizeString(val) : undefined));

/**
 * URL Schema
 */
const urlSchema = z.string().url("Invalid URL format").optional();

/**
 * Boolean Schema with string coercion
 */
const booleanSchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform(val => {
    if (typeof val === "boolean") return val;
    return val === "true";
  });

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate request with schema
 * @param {Object} schema - Zod schema
 * @param {Object} data - Data to validate
 * @throws {ApiError} If validation fails
 * @returns {Object} Validated data
 */
const validateRequest = (schema, data) => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw ApiError.validation(errors);
    }
    throw error;
  }
};

/**
 * Async validation wrapper
 * @param {Object} schema - Zod schema
 * @param {Object} data - Data to validate
 * @returns {Promise<Object>} Validated data
 */
const validateAsync = async (schema, data) => {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw ApiError.validation(errors);
    }
    throw error;
  }
};

/**
 * Safe parse - returns success/error object instead of throwing
 * @param {Object} schema - Zod schema
 * @param {Object} data - Data to validate
 * @returns {Object} { success: boolean, data?: any, errors?: array }
 */
const safeParse = (schema, data) => {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join("."),
      message: err.message,
    })),
  };
};

/**
 * Validate array of UUIDs
 * @param {Array} ids - Array of UUID strings
 * @returns {boolean} All valid UUIDs
 */
const validateUUIDArray = ids => {
  if (!Array.isArray(ids)) return false;
  return ids.every(id => isValidUUID(id));
};

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @throws {ApiError} If validation fails
 */
const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    throw ApiError.badRequest("Invalid start date");
  }

  if (isNaN(end.getTime())) {
    throw ApiError.badRequest("Invalid end date");
  }

  if (start > end) {
    throw ApiError.badRequest("Start date must be before end date");
  }
};

/**
 * Validate sort parameters
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @param {Array} allowedFields - Allowed sort fields
 * @returns {Object} Validated sort params
 */
const validateSort = (sortBy, sortOrder = "desc", allowedFields = []) => {
  const order = ["asc", "desc"].includes(sortOrder?.toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  if (!sortBy) {
    return { sortBy: allowedFields[0] || "created_at", sortOrder: order };
  }

  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    throw ApiError.badRequest(
      `Invalid sort field. Allowed fields: ${allowedFields.join(", ")}`,
    );
  }

  return { sortBy, sortOrder: order };
};

// ============================================================================
//   DEFAULT VALIDATOR OBJECT
// ============================================================================

export default {
  isValidUUID,
  isValidEmail,
  isValidUrl,
  sanitizeString,
  validatePagination,
  validateQuality,
  validateRequest,
  validateAsync,
  safeParse,
  validateUUIDArray,
  validateDateRange,
  validateSort,
  schemas: {
    uuid: uuidSchema,
    email: emailSchema,
    password: passwordSchema,
    pagination: paginationSchema,
    searchQuery: searchQuerySchema,
    audioQuality: audioQualitySchema,
    songTitle: songTitleSchema,
    artistName: artistNameSchema,
    albumName: albumNameSchema,
    genre: genreSchema,
    duration: durationSchema,
    year: yearSchema,
    playlistName: playlistNameSchema,
    playlistDescription: playlistDescriptionSchema,
    url: urlSchema,
    boolean: booleanSchema,
  },
};
