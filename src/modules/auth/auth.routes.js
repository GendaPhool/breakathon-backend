// ============================================================
// src/modules/auth/auth.routes.js
// ============================================================

const { Router } = require("express");
const { authenticate } = require("../../middleware/auth");
const { validateBodyZod } = require("../../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./auth.validation");
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} = require("./auth.controller");

const router = Router();

// POST /api/v1/auth/register
router.post("/register", validateBodyZod(registerSchema), register);

// POST /api/v1/auth/login
router.post("/login", validateBodyZod(loginSchema), login);

// GET /api/v1/auth/me  (protected)
router.get("/me", authenticate, getMe);

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", validateBodyZod(forgotPasswordSchema), forgotPassword);

// POST /api/v1/auth/reset-password
router.post("/reset-password", validateBodyZod(resetPasswordSchema), resetPassword);

module.exports = router;
