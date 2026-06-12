// ============================================================
// src/utils/jwt.js
// JWT utility functions — generate and verify access tokens
// ============================================================

const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * Generate a signed JWT access token for a user.
 * @param {Object} payload - Data to embed (id, email, role)
 * @returns {string} Signed JWT string
 */
const generateAccessToken = (payload) => {
  if (!payload || !payload.id) {
    throw new Error("Token payload must include user id");
  }

  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: "bug-management-platform",
    }
  );
};

/**
 * Verify a JWT access token and return the decoded payload.
 * @param {string} token - JWT string to verify
 * @returns {Object} Decoded payload { id, email, role, iat, exp }
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
const verifyAccessToken = (token) => {
  if (!token) {
    throw new Error("Token is required");
  }

  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "bug-management-platform",
  });
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
