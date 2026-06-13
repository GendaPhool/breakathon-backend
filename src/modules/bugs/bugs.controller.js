// ============================================================
// src/modules/bugs/bugs.controller.js
// ============================================================

const { sendCreated, sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const service = require("./bugs.service");

const createBug = async (req, res) => {
  const bug = await service.createBug(req.body);
  return sendCreated(res, "Bug report submitted successfully.", { bug });
};

const getBugs = async (req, res) => {
  const result = await service.getBugs(req.user, req.query);
  return sendPaginated(res, "Bugs fetched.", result.bugs, result.pagination);
};

const getBugById = async (req, res) => {
  const bug = await service.getBugById(req.params.id, req.user);
  return sendSuccess(res, "Bug report fetched.", { bug });
};

const updateBug = async (req, res) => {
  const bug = await service.updateBug(req.params.id, req.body, req.user);
  return sendSuccess(res, "Bug report updated.", { bug });
};

const changeBugStatus = async (req, res) => {
  const bug = await service.changeBugStatus(req.params.id, req.body, req.user.id);
  return sendSuccess(res, "Bug status updated.", { bug });
};

const verifyParticipant = async (req, res) => {
  const registration = await service.verifyParticipant(req.params.participant_id);
  return sendSuccess(res, "Participant verified.", { registration });
};

const getLeaderboard = async (req, res) => {
  const leaderboard = await service.getLeaderboard();
  return sendSuccess(res, "Leaderboard fetched.", { leaderboard });
};

module.exports = {
  createBug,
  getBugs,
  getBugById,
  updateBug,
  changeBugStatus,
  verifyParticipant,
  getLeaderboard,
};
