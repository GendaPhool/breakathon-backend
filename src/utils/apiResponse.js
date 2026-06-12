// ============================================================
// src/utils/apiResponse.js
// Standardized API response helpers
// Format: { success: boolean, message: string, data: any }
// ============================================================

/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {any} data
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, message = "Success", data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a created (201) JSON response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {any} data
 */
const sendCreated = (res, message = "Created successfully", data = null) => {
  return sendSuccess(res, message, data, 201);
};

/**
 * Send a paginated JSON response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {Array} items
 * @param {{ page: number, limit: number, total: number }} pagination
 */
const sendPaginated = (res, message = "Success", items = [], pagination = {}) => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
      },
    },
  });
};

/**
 * Send an error JSON response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {any} errors - Optional field-level validation errors
 */
const sendError = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    data: null,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendError,
};
