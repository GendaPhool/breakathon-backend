// ============================================================
// src/middleware/auth.js
// JWT Authentication Middleware
// Verifies token and attaches decoded user to req.user
// ============================================================

const { verifyAccessToken } = require("../utils/jwt");
const { sendError } = require("../utils/apiResponse");
const prisma = require("../config/db");

/**
 * Middleware: Verify JWT and attach req.user
 * Expects: Authorization: Bearer <token>
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Access denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return sendError(res, "Access denied. Malformed token.", 401);
    }

    const decoded = verifyAccessToken(token);

    // Confirm user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      return sendError(res, "User no longer exists.", 401);
    }

    if (!user.isActive) {
      return sendError(res, "Your account has been deactivated.", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token has expired. Please log in again.", 401);
    }
    if (error.name === "JsonWebTokenError") {
      return sendError(res, "Invalid token.", 401);
    }
    next(error);
  }
};

module.exports = { authenticate };
