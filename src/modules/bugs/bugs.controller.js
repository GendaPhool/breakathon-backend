// ============================================================
// src/modules/bugs/bugs.controller.js
// ============================================================

const { sendCreated, sendSuccess } = require("../../utils/apiResponse");
const bugsService = require("./bugs.service");

const createBug = async (req, res) => {
  const bug = await bugsService.createBug(req.body);
  return sendCreated(res, "Bug report submitted successfully.", { bug });
};

const getBugs = async (req, res) => {
  const { bugs, pagination } = await bugsService.getBugs(req.user, req.query);
  const { sendPaginated } = require("../../utils/apiResponse");
  return sendPaginated(res, "Bug reports fetched successfully.", bugs, pagination);
};

const getBugById = async (req, res) => {
  const bug = await bugsService.getBugById(req.params.id, req.user);
  return sendSuccess(res, "Bug report fetched successfully.", { bug });
};

const updateBug = async (req, res) => {
  const bug = await bugsService.updateBug(req.params.id, req.body, req.user);
  return sendSuccess(res, "Bug report updated successfully.", { bug });
};

const changeBugStatus = async (req, res) => {
  const bug = await bugsService.changeBugStatus(req.params.id, req.body, req.user.id);
  return sendSuccess(res, "Bug status updated.", { bug });
};

const verifyParticipant = async (req, res) => {
  const registration = await bugsService.verifyParticipant(req.params.participant_id);
  return sendSuccess(res, "Participant verified.", { registration });
};

const getLeaderboard = async (req, res) => {
  const leaderboard = await bugsService.getLeaderboard();
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
