// ============================================================
// src/middleware/role.js
// Role-Based Access Control (RBAC) Middleware
// Must be used AFTER authenticate middleware
// ============================================================

const { sendError } = require("../utils/apiResponse");

/**
 * Restrict route to MARSHAL role only.
 * Usage: router.get("/marshal-only", authenticate, requireMarshal(), handler)
 */
const requireMarshal = () => (req, res, next) => {
  if (!req.user) {
    return sendError(res, "Authentication required.", 401);
  }

  if (req.user.role !== "MARSHAL") {
    return sendError(res, "Access denied. Marshals only.", 403);
  }

  next();
};

/**
 * Restrict route to PARTICIPANT role only.
 * Usage: router.post("/submit", authenticate, requireParticipant(), handler)
 */
const requireParticipant = () => (req, res, next) => {
  if (!req.user) {
    return sendError(res, "Authentication required.", 401);
  }

  if (req.user.role !== "PARTICIPANT") {
    return sendError(res, "Access denied. Participants only.", 403);
  }

  next();
};

/**
 * Allow access to both MARSHAL and PARTICIPANT (any authenticated user).
 */
const requireAnyRole = () => (req, res, next) => {
  if (!req.user) {
    return sendError(res, "Authentication required.", 401);
  }

  if (!["MARSHAL", "PARTICIPANT"].includes(req.user.role)) {
    return sendError(res, "Access denied. Unknown role.", 403);
  }

  next();
};

module.exports = {
  requireMarshal,
  requireParticipant,
  requireAnyRole,
};
