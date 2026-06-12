// ============================================================
// src/modules/eventsettings/eventsettings.controller.js
// ============================================================

const { sendSuccess } = require("../../utils/apiResponse");
const service = require("./eventsettings.service");

const getSettings = async (req, res) => {
  const settings = await service.getSettings();
  return sendSuccess(res, "Event settings fetched.", { settings });
};

const upsertSettings = async (req, res) => {
  const settings = await service.upsertSettings(req.body);
  return sendSuccess(res, "Event settings saved.", { settings });
};

module.exports = { getSettings, upsertSettings };
