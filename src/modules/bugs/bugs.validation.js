// ============================================================
// src/modules/bugs/bugs.validation.js
// ============================================================

const { z } = require("zod");

const BugCategory = z.enum([
  "CUSTOMER_APP",
  "ADMIN_DASHBOARD",
  "DELIVERY_PARTNER_APP",
  "PRODUCTION_DASHBOARD",
  "ROUTE_MANAGEMENT",
  "SUBSCRIPTION_MANAGEMENT",
  "PAYMENT_SYSTEM",
  "WALLET_SYSTEM",
  "NOTIFICATION_SYSTEM",
]);

const BugStatus = z.enum([
  "PENDING_REVIEW",
  "VALIDATED",
  "REJECTED",
  "NEEDS_MORE_INFO",
  "DUPLICATE",
]);

const BugSeverity = z.enum([
  "LAUNCH_BLOCKER",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

// Participant submits new bug
const createBugSchema = z.object({
  module: BugCategory,
  bug_title: z.string().trim().min(1, "Bug title is required").max(100),
  steps_to_reproduce: z.string().trim().min(1).max(300),
  expected_behavior: z.string().trim().min(1).max(200),
  actual_behavior: z.string().trim().min(1).max(200),
  screenshot_url: z.string().url("screenshot_url must be a valid URL"),
  screen_recording_url: z.string().url().optional().or(z.literal("")).nullable(),
  participant_id: z.string().min(1, "participant_id is required"),
  participant_name: z.string().min(1, "participant_name is required"),
  is_confirming_duplicate: z.boolean().optional(),
});

// Marshal or participant updates a bug (all optional, service enforces role-based field access)
const marshalUpdateSchema = z.object({
  // Participant-writable
  bug_title: z.string().trim().min(1).max(100).optional(),
  steps_to_reproduce: z.string().trim().min(1).max(300).optional(),
  expected_behavior: z.string().trim().min(1).max(200).optional(),
  actual_behavior: z.string().trim().min(1).max(200).optional(),
  screen_recording_url: z.string().url().optional().or(z.literal("")).nullable(),
  // Marshal-writable
  severity: BugSeverity.optional().nullable(),
  points_awarded: z.number().min(0).optional(),
  marshal_notes: z.string().optional().nullable(),
  duplicate_of: z.string().optional().nullable(),
  is_confirming_duplicate: z.boolean().optional(),
});

// Marshal quick-action: change status only
const changeStatusSchema = z.object({
  status: BugStatus,
});

module.exports = {
  createBugSchema,
  marshalUpdateSchema,
  changeStatusSchema,
};
