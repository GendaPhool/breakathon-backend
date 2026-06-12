// ============================================================
// src/middleware/errorHandler.js
// Global Error Handler Middleware
// Must be registered LAST in app.js (after all routes)
// ============================================================

const env = require("../config/env");

/**
 * Centralized error handler for Express.
 * Catches all errors passed via next(err) or thrown inside
 * async routes (requires express-async-errors to be required).
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log the error
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err);

  // Default error shape
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";

  // -----------------------------------------------------------
  // Prisma-specific errors
  // -----------------------------------------------------------
  if (err.code === "P2002") {
    // Unique constraint violation
    const field = err.meta?.target?.[0] || "field";
    statusCode = 409;
    message = `A record with this ${field} already exists.`;
  } else if (err.code === "P2025") {
    // Record not found
    statusCode = 404;
    message = err.meta?.cause || "Record not found.";
  } else if (err.code === "P2003") {
    // Foreign key constraint failure
    statusCode = 400;
    message = "Related record does not exist.";
  } else if (err.code === "P2016" || err.code === "P2023") {
    // Invalid ID / malformed UUID
    statusCode = 400;
    message = "Invalid identifier format.";
  }

  // -----------------------------------------------------------
  // JWT errors (in case they bubble up outside auth middleware)
  // -----------------------------------------------------------
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please log in again.";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token.";
  }

  // -----------------------------------------------------------
  // JSON parse errors (malformed request body)
  // -----------------------------------------------------------
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body.";
  }

  const response = {
    success: false,
    message,
    data: null,
  };

  // Include stack trace only in development
  if (env.isDev) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler.
 * Register BEFORE errorHandler but AFTER all routes.
 */
const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    data: null,
  });
};

module.exports = { errorHandler, notFoundHandler };
