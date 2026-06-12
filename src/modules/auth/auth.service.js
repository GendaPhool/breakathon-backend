// ============================================================
// src/modules/auth/auth.service.js
// Authentication business logic
// ============================================================

const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const { generateAccessToken } = require("../../utils/jwt");

const SALT_ROUNDS = 12;

// Shape user object the way the frontend expects:
// - full_name: alias for name (AppLayout reads user.full_name)
// - marshal: boolean (MarshalGate checks me.marshal)
// - role: lowercase string (MarshalGate checks me.role === "marshal")
const shapeUser = (user) => ({
  id: user.id,
  name: user.name,
  full_name: user.name,
  email: user.email,
  role: user.role.toLowerCase(),
  marshal: user.role === "MARSHAL",
  isActive: user.isActive,
});

/**
 * Register a new participant.
 */
const registerUser = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("An account with this email already exists.");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "PARTICIPANT", isActive: true },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });

  return { user: shapeUser(user), token };
};

/**
 * Log in an existing user.
 */
const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true, role: true, isActive: true },
  });

  if (!user) {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error("Your account has been deactivated. Please contact support.");
    err.statusCode = 403;
    throw err;
  }

  const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;

  return { user: shapeUser(safeUser), token };
};

/**
 * Return authenticated user profile.
 */
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  return shapeUser(user);
};

/**
 * ForgotPassword — silent stub, never reveals if email exists.
 * TODO: generate signed reset token, store hash in DB, send email via provider.
 */
const forgotPassword = async ({ email }) => {
  await prisma.user.findUnique({ where: { email } });
  // Intentionally returns nothing regardless of whether user exists
};

/**
 * ResetPassword — stub that succeeds silently.
 * Frontend navigates to /login after this call.
 * TODO: validate token against DB, find user, update passwordHash.
 */
const resetPassword = async ({ token, password }) => {
  // Suppress unused variable warnings — real impl goes here
  void token;
  void password;
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
};
