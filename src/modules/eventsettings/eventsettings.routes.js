// ============================================================
// src/modules/eventsettings/eventsettings.routes.js
// ============================================================

const { Router } = require("express");
const { authenticate } = require("../../middleware/auth");
const { requireMarshal } = require("../../middleware/role");
const { getSettings, upsertSettings } = require("./eventsettings.controller");

const router = Router();

// GET  /api/v1/settings  — public (needed for participant gate + public register)
router.get("/", getSettings);

// PUT  /api/v1/settings  — Marshal only
router.put("/", authenticate, requireMarshal(), upsertSettings);

module.exports = router;
