// ============================================================
// src/modules/eventsettings/eventsettings.public.controller.js
// Handles Base44-style entity list for EventSettings (public).
// ============================================================

const { sendSuccess } = require("../../utils/apiResponse");
const { getSettings } = require("./eventsettings.service");

/**
 * GET /api/apps/:appId/entities/EventSettings
 * Frontend: base44.entities.EventSettings.list()
 * Returns an array (Base44 list convention); frontend picks [0].
 */
const listEventSettings = async (_req, res) => {
  const settings = await getSettings();
  // Wrap in array to match Base44 .list() expectation
  return sendSuccess(res, "Event settings fetched.", settings ? [settings] : []);
};

module.exports = { listEventSettings };
