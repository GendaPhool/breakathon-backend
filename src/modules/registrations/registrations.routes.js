// ============================================================
// src/modules/registrations/registrations.routes.js
// ============================================================

const { Router } = require("express");
const { authenticate } = require("../../middleware/auth");
const { requireMarshal } = require("../../middleware/role");
const { validateBodyZod } = require("../../middleware/validate");
const {
  createRegistrationSchema,
  updateRegistrationSchema,
} = require("./registrations.validation");
const {
  listRegistrations,
  searchRegistrations,
  createRegistration,
  updateRegistration,
  verifyRegistration,
  rejectRegistration,
  toggleBadge,
  checkInRegistration,
  getByParticipantId,
} = require("./registrations.controller");

const router = Router();

// ── Public ────────────────────────────────────────────────────

// POST /api/v1/registrations  — no auth (public sign-up form)
router.post("/", validateBodyZod(createRegistrationSchema), createRegistration);

// ── Marshal only ──────────────────────────────────────────────

// GET  /api/v1/registrations           — list all (supports ?payment_status= filter)
router.get("/", authenticate, requireMarshal(), listRegistrations);

// GET  /api/v1/registrations/search    — search by name, phone, or participant_id (?q=)
router.get("/search", authenticate, requireMarshal(), searchRegistrations);

// GET  /api/v1/registrations/participant/:participant_id  — GP-001 format lookup for check-in gate
router.get(
  "/participant/:participant_id",
  authenticate,
  requireMarshal(),
  getByParticipantId
);

// PATCH /api/v1/registrations/:id          — generic update
router.patch(
  "/:id",
  authenticate,
  requireMarshal(),
  validateBodyZod(updateRegistrationSchema),
  updateRegistration
);

// PATCH /api/v1/registrations/:id/verify   — sets VERIFIED + auto-generates GP-XXX participant_id
router.patch("/:id/verify", authenticate, requireMarshal(), verifyRegistration);

// PATCH /api/v1/registrations/:id/reject   — sets REJECTED
router.patch("/:id/reject", authenticate, requireMarshal(), rejectRegistration);

// PATCH /api/v1/registrations/:id/checkin  — marks checked_in + checked_in_at (event-day)
router.patch("/:id/checkin", authenticate, requireMarshal(), checkInRegistration);

// PATCH /api/v1/registrations/:id/badge    — toggles badge_printed
router.patch("/:id/badge", authenticate, requireMarshal(), toggleBadge);

module.exports = router;
