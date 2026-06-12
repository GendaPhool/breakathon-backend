// ============================================================
// src/modules/auth/auth.validation.js
// ============================================================

const { z } = require("zod");

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be at most 100 characters."),

  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address."),

  password: z
    .string({ required_error: "Password is required." })
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address."),

  password: z.string({ required_error: "Password is required." }).min(1, "Password is required."),
});

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address."),
});

// Critical fix #4: SDK's auth.resetPassword() sends { reset_token, new_password }
// but the original schema expected { token, password }. Accept both shapes.
const resetPasswordSchema = z
  .object({
    // SDK-sent names
    reset_token: z.string().optional(),
    new_password: z.string().min(8, "Password must be at least 8 characters.").optional(),
    // Alternate names (direct callers)
    token: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters.").optional(),
  })
  .transform((val) => ({
    token:    val.token    ?? val.reset_token,
    password: val.password ?? val.new_password,
  }))
  .refine((val) => !!val.token,    { message: "Token is required." })
  .refine((val) => !!val.password, { message: "Password is required (min 8 chars)." });

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
