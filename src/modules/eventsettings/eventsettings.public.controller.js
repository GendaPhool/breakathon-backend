// ============================================================
// src/modules/eventsettings/eventsettings.public.controller.js
// Handles custom entity list for EventSettings (public).
// ============================================================

const { sendSuccess } = require("../../utils/apiResponse");
const { getSettings } = require("./eventsettings.service");

/**
 * GET /api/apps/:appId/entities/EventSettings
 * Frontend: apiClient.entities.EventSettings.list()
 * Returns an array (list convention); frontend picks [0].
 */
const listEventSettings = async (_req, res) => {
  const settings = await getSettings();
  // Wrap in array to match .list() response expectation
  return sendSuccess(res, "Event settings fetched.", settings ? [settings] : []);
};

module.exports = { listEventSettings };
