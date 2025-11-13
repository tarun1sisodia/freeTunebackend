/**
 * Standard API Response handlers
 * Provides consistent response formats across the application
 */

import ApiError from './apiError.js';
import { LOG_LEVELS, RESPONSE_STRUCTURE, SUCCESS_MESSAGES } from './constants.js';

/**
 * ApiResponse Class for structured responses
 */
class ApiResponse {
  constructor(
    statusCode,
    data = null,
    message = RESPONSE_STRUCTURE.SUCCESS_KEY,
  ) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Send success response using ApiResponse
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (
  res,
  data,
  message = RESPONSE_STRUCTURE.SUCCESS_KEY,
  statusCode = 200,
) => {
  const response = new ApiResponse(statusCode, data, message);
  return res.status(statusCode).json(response);
};

/**
 * Send error response using ApiError
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Array} errors - Array of error details
 */
const errorResponse = (
  res,
  message = LOG_LEVELS.ERROR,
  statusCode = 500,
  errors = [],
) => {
  const error = new ApiError(statusCode, message, errors);
  // Remove stack from response for security (optional: keep if needed)
  const { stack, ...resp } = error;
  return res.status(statusCode).json(resp);
};

/**
 * Send paginated response using ApiResponse
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number|string} page - Current page number
 * @param {number|string} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const paginatedResponse = (
  res,
  data,
  page,
  limit,
  total,
  message = RESPONSE_STRUCTURE.SUCCESS_KEY,
) => {
  const currentPage = parseInt(page, 10);
  const itemsPerPage = parseInt(limit, 10);
  const totalPages = Math.ceil(total / itemsPerPage);

  const response = new ApiResponse(200, data, message);
  response.pagination = {
    page: currentPage,
    limit: itemsPerPage,
    total,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
  };
  return res.status(200).json(response);
};

/**
 * Send created response (201) using ApiResponse
 */
const createdResponse = (res, data, message = SUCCESS_MESSAGES.CREATED) => {
  return successResponse(res, data, message, 201);
};

/**
 * Send no content response (204)
 */
const noContentResponse = res => {
  return res.status(204).send();
};

/**
 * Send cached response with cache info using ApiResponse
 */
const cachedResponse = (
  res,
  data,
  cacheInfo,
  message = RESPONSE_STRUCTURE.SUCCESS_KEY,
) => {
  const response = new ApiResponse(200, data, message);
  response.cache = {
    hit: true,
    ...cacheInfo,
  };
  return res.status(200).json(response);
};

export {
  ApiResponse,
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  cachedResponse,
};
