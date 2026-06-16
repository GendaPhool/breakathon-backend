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

// Human-readable module values as sent by the frontend (converted to DB
// enum values by toDb() in bugs.entity.controller.js, AFTER this validation runs).
const BugCategoryLabel = z.enum([
  "Customer App",
  "Admin Dashboard",
  "Delivery Partner App",
  "Production Dashboard",
  "Route Management",
  "Subscription Management",
  "Payment System",
  "Wallet System",
  "Notification System",
]);

// Participant submits new bug
const createBugSchema = z.object({
  module: BugCategoryLabel,
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

// Human-readable status labels sent by the frontend
const BugStatusLabel = z.enum([
  "Pending Review",
  "Validated",
  "Rejected",
  "Needs More Info",
  "Duplicate",
]);

// Human-readable severity labels sent by the frontend (BugDetailPanel sends these)
const BugSeverityLabel = z.enum([
  "Launch Blocker",
  "Critical",
  "High",
  "Medium",
  "Low",
]);

// Marshal or participant updates a bug (all optional, service enforces role-based field access)
const marshalUpdateSchema = z.object({
  // Status — quick actions in MarshalQueue send this
  status: BugStatusLabel.optional().nullable(),
  // Participant-writable
  bug_title: z.string().trim().min(1).max(100).optional(),
  steps_to_reproduce: z.string().trim().min(1).max(300).optional(),
  expected_behavior: z.string().trim().min(1).max(200).optional(),
  actual_behavior: z.string().trim().min(1).max(200).optional(),
  screen_recording_url: z.string().url().optional().or(z.literal("")).nullable(),
  // Marshal-writable — frontend sends human-readable labels ("Launch Blocker" etc.)
  severity: BugSeverityLabel.optional().nullable(),
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
