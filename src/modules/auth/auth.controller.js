// ============================================================
// src/modules/auth/auth.controller.js
// ============================================================

const { sendCreated, sendSuccess } = require("../../utils/apiResponse");
const authService = require("./auth.service");

const register = async (req, res) => {
  const { user, token } = await authService.registerUser(req.body);
  return sendCreated(res, "Registration successful.", { user, token });
};

const login = async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);
  return sendSuccess(res, "Login successful.", { user, token });
};

const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return sendSuccess(res, "Profile fetched successfully.", { user });
};

const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.body);
  // Always 200 — never reveal whether email exists
  return sendSuccess(res, "If that email exists, a reset link has been sent.", null);
};

const resetPassword = async (req, res) => {
  await authService.resetPassword(req.body);
  // Stub succeeds — frontend navigates to /login after this
  return sendSuccess(res, "Password reset successfully.", null);
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };
