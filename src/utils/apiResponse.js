/**
 * Standard API Response handlers
 * Provides consistent response formats across the application
 */

/**
 * ApiResponse Class for structured responses
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Array} errors - Array of error details
 */
const errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const paginatedResponse = (res, data, page, limit, total, message = 'Success') => {
  const currentPage = parseInt(page);
  const itemsPerPage = parseInt(limit);
  const totalPages = Math.ceil(total / itemsPerPage);

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: currentPage,
      limit: itemsPerPage,
      total,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send created response (201)
 */
const createdResponse = (res, data, message = 'Resource created successfully') => {
  return successResponse(res, data, message, 201);
};

/**
 * Send no content response (204)
 */
const noContentResponse = res => {
  return res.status(204).send();
};

/**
 * Send cached response with cache info
 */
const cachedResponse = (res, data, cacheInfo, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    cache: {
      hit: true,
      ...cacheInfo,
    },
    timestamp: new Date().toISOString(),
  });
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
