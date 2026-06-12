// ============================================================
// src/modules/registrations/registrations.public.controller.js
// Handles Base44-style entity CRUD for Registration (public-facing).
// ============================================================

const { sendSuccess, sendCreated, sendError } = require("../../utils/apiResponse");
const { filterRegistrations, createPublicRegistration } = require("./registrations.public.service");

/**
 * GET /api/apps/:appId/entities/Registration
 * Query params: filter[email]=...  (Base44 SDK filter syntax)
 *
 * Frontend: base44.entities.Registration.filter({ email })
 */
const listOrFilterRegistrations = async (req, res) => {
  // Base44 SDK sends filters as: ?filter[email]=foo@bar.com
  // Express parses nested brackets into req.query.filter object automatically
  const filterParams = req.query.filter || {};
  const results = await filterRegistrations(filterParams);
  return sendSuccess(res, "Registrations fetched.", results);
};

/**
 * POST /api/apps/:appId/entities/Registration
 * Body: { name, email, phone, city, occupation, how_did_you_hear, payment_reference, ... }
 *
 * Frontend: base44.entities.Registration.create({ ...form })
 */
const createRegistration = async (req, res) => {
  try {
    const registration = await createPublicRegistration(req.body);
    // Base44 SDK expects the raw created object directly (not wrapped in sendCreated)
    // so that base44.entities.Registration.create() returns the registration itself.
    return res.status(201).json(registration);
  } catch (err) {
    if (err.message === "EMAIL_EXISTS") {
      return sendError(res, err.clientMessage || "Email already registered.", 409);
    }
    throw err; // let errorHandler catch unexpected errors
  }
};

module.exports = { listOrFilterRegistrations, createRegistration };
