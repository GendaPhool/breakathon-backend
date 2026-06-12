// ============================================================
// src/middleware/validate.js
// Request Body Validation Middleware
// Uses a schema object with a .validate() or .safeParse() method
// Compatible with Joi and Zod schemas
// ============================================================

const { sendError } = require("../utils/apiResponse");

/**
 * Validate req.body against a Joi schema.
 * Usage: router.post("/route", validateBody(myJoiSchema), handler)
 * @param {Object} schema - Joi schema with a .validate() method
 */
const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,     // collect all errors, not just the first
    stripUnknown: true,    // remove fields not in schema
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.context?.key || "unknown",
      message: d.message.replace(/['"]/g, ""),
    }));

    return sendError(res, "Validation failed.", 422, errors);
  }

  req.body = value; // replace body with sanitized/coerced values
  next();
};

/**
 * Validate req.body against a Zod schema.
 * Usage: router.post("/route", validateBodyZod(myZodSchema), handler)
 * @param {Object} schema - Zod schema with a .safeParse() method
 */
const validateBodyZod = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join(".") || "unknown",
      message: e.message,
    }));

    return sendError(res, "Validation failed.", 422, errors);
  }

  req.body = result.data;
  next();
};

/**
 * Validate req.params against a Joi schema.
 * Useful for validating UUID params, etc.
 * @param {Object} schema - Joi schema
 */
const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, { abortEarly: false });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.context?.key || "unknown",
      message: d.message.replace(/['"]/g, ""),
    }));

    return sendError(res, "Invalid URL parameters.", 400, errors);
  }

  req.params = value;
  next();
};

/**
 * Validate req.query against a Joi schema.
 * @param {Object} schema - Joi schema
 */
const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.context?.key || "unknown",
      message: d.message.replace(/['"]/g, ""),
    }));

    return sendError(res, "Invalid query parameters.", 400, errors);
  }

  req.query = value;
  next();
};

module.exports = {
  validateBody,
  validateBodyZod,
  validateParams,
  validateQuery,
};
