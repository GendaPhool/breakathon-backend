// ============================================================
// src/modules/bugs/bugs.routes.js
// ============================================================

const { Router } = require("express");
const { authenticate } = require("../../middleware/auth");
const { requireMarshal } = require("../../middleware/role");
const { validateBodyZod } = require("../../middleware/validate");
const { createBugSchema, marshalUpdateSchema, changeStatusSchema } = require("./bugs.validation");
const {
  createBug,
  getBugs,
  getBugById,
  updateBug,
  changeBugStatus,
  verifyParticipant,
  getLeaderboard,
} = require("./bugs.controller");

const router = Router();

router.use(authenticate);

// GET  /api/v1/bugs/leaderboard            — any authenticated user
router.get("/leaderboard", getLeaderboard);

// GET  /api/v1/bugs/verify-participant/:participant_id — Marshal only. Takes participant_id,
//      returns registration checked_in status. Used by ParticipantGate.jsx at login flow.
router.get("/verify-participant/:participant_id", requireMarshal(), verifyParticipant);

// POST /api/v1/bugs                        — participant submits a bug report
router.post("/", validateBodyZod(createBugSchema), createBug);

// GET  /api/v1/bugs                        — participant (own) / marshal (all, filterable)
router.get("/", getBugs);

// GET  /api/v1/bugs/:id
router.get("/:id", getBugById);

// PATCH /api/v1/bugs/:id                   — participant edits own; marshal edits severity/notes
router.patch("/:id", validateBodyZod(marshalUpdateSchema), updateBug);

// PATCH /api/v1/bugs/:id/status            — Marshal only. Quick action: validate/reject/duplicate/needsInfo
router.patch("/:id/status", requireMarshal(), validateBodyZod(changeStatusSchema), changeBugStatus);

module.exports = router;
