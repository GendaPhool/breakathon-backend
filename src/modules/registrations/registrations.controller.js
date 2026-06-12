// ============================================================
// src/modules/registrations/registrations.controller.js
// ============================================================

const { sendCreated, sendSuccess } = require("../../utils/apiResponse");
const service = require("./registrations.service");

const listRegistrations = async (req, res) => {
  const registrations = await service.listRegistrations(req.query);
  return sendSuccess(res, "Registrations fetched.", { registrations });
};

const searchRegistrations = async (req, res) => {
  const registrations = await service.searchRegistrations(req.query.q);
  return sendSuccess(res, "Search results.", { registrations });
};

const createRegistration = async (req, res) => {
  const registration = await service.createRegistration(req.body);
  return sendCreated(res, "Registration submitted. Pending payment verification.", { registration });
};

const updateRegistration = async (req, res) => {
  const registration = await service.updateRegistration(req.params.id, req.body);
  return sendSuccess(res, "Registration updated.", { registration });
};

const verifyRegistration = async (req, res) => {
  // Need all current verified registrations to generate next GP-XXX id
  const allRegs = await service.listRegistrations({ payment_status: "VERIFIED" });
  const registration = await service.verifyRegistration(req.params.id, allRegs);
  return sendSuccess(res, "Registration verified.", { registration });
};

const rejectRegistration = async (req, res) => {
  const registration = await service.rejectRegistration(req.params.id);
  return sendSuccess(res, "Registration rejected.", { registration });
};

const toggleBadge = async (req, res) => {
  const registration = await service.toggleBadge(req.params.id);
  return sendSuccess(res, "Badge status updated.", { registration });
};

const checkInRegistration = async (req, res) => {
  const registration = await service.checkInRegistration(req.params.id);
  return sendSuccess(res, "Participant checked in.", { registration });
};

const getByParticipantId = async (req, res) => {
  const registration = await service.getRegistrationByParticipantId(req.params.participant_id);
  return sendSuccess(res, "Registration fetched.", { registration });
};

module.exports = {
  listRegistrations,
  searchRegistrations,
  createRegistration,
  updateRegistration,
  verifyRegistration,
  rejectRegistration,
  toggleBadge,
  checkInRegistration,
  getByParticipantId,
};
