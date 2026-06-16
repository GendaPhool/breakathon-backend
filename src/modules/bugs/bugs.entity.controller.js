// ============================================================
// src/modules/bugs/bugs.entity.controller.js
//
// Custom adapter for BugReport entity.
// The frontend (apiClient) uses human-readable enum values and
// a "created_date" field; the DB stores SCREAMING_SNAKE_CASE enums
// and "createdAt". This layer translates both directions.
//
// Endpoints wired in appRouter.js:
//   GET    /entities/BugReport           → list / filter
//   POST   /entities/BugReport           → create
//   PUT    /entities/BugReport/:id       → update (full)
//   PATCH  /entities/BugReport/:id       → update (partial)
// ============================================================

const prisma = require("../../config/db");

// ── Enum maps (human-readable ↔ DB) ──────────────────────────

const MODULE_TO_DB = {
  "Customer App":              "CUSTOMER_APP",
  "Admin Dashboard":           "ADMIN_DASHBOARD",
  "Delivery Partner App":      "DELIVERY_PARTNER_APP",
  "Production Dashboard":      "PRODUCTION_DASHBOARD",
  "Route Management":          "ROUTE_MANAGEMENT",
  "Subscription Management":   "SUBSCRIPTION_MANAGEMENT",
  "Payment System":            "PAYMENT_SYSTEM",
  "Wallet System":             "WALLET_SYSTEM",
  "Notification System":       "NOTIFICATION_SYSTEM",
};

const MODULE_FROM_DB = Object.fromEntries(
  Object.entries(MODULE_TO_DB).map(([k, v]) => [v, k])
);

const STATUS_TO_DB = {
  "Pending Review":  "PENDING_REVIEW",
  "Validated":       "VALIDATED",
  "Rejected":        "REJECTED",
  "Needs More Info": "NEEDS_MORE_INFO",
  "Duplicate":       "DUPLICATE",
};

const STATUS_FROM_DB = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([k, v]) => [v, k])
);

const SEVERITY_TO_DB = {
  "Launch Blocker": "LAUNCH_BLOCKER",
  "Critical":       "CRITICAL",
  "High":           "HIGH",
  "Medium":         "MEDIUM",
  "Low":            "LOW",
};

const SEVERITY_FROM_DB = Object.fromEntries(
  Object.entries(SEVERITY_TO_DB).map(([k, v]) => [v, k])
);

// ── Helper: translate one DB row → frontend shape ────────────

function toFrontend(row) {
  return {
    id:                      row.id,
    participant_id:          row.participant_id,
    participant_name:        row.participant_name,
    module:                  MODULE_FROM_DB[row.module]  ?? row.module,
    bug_title:               row.bug_title,
    steps_to_reproduce:      row.steps_to_reproduce,
    expected_behavior:       row.expected_behavior,
    actual_behavior:         row.actual_behavior,
    screenshot_url:          row.screenshot_url,
    screen_recording_url:    row.screen_recording_url ?? "",
    status:                  STATUS_FROM_DB[row.status]  ?? row.status,
    severity:                row.severity ? (SEVERITY_FROM_DB[row.severity] ?? row.severity) : null,
    points_awarded:          row.points_awarded ?? 0,
    marshal_notes:           row.marshal_notes ?? "",
    duplicate_of:            row.duplicate_of ?? "",
    is_confirming_duplicate: row.is_confirming_duplicate ?? false,
    // The SDK / frontend reads "created_date" (not "createdAt")
    created_date:            row.createdAt?.toISOString?.() ?? row.createdAt ?? null,
    updated_date:            row.updatedAt?.toISOString?.() ?? row.updatedAt ?? null,
  };
}

// ── Helper: translate frontend payload → DB shape ─────────────

function toDb(body) {
  const out = {};

  if (body.module           !== undefined) out.module   = MODULE_TO_DB[body.module]   ?? body.module;
  if (body.status           !== undefined) out.status   = STATUS_TO_DB[body.status]   ?? body.status;
  if (body.severity         !== undefined) out.severity = body.severity
    ? (SEVERITY_TO_DB[body.severity] ?? body.severity)
    : null;

  // Pass-through fields
  const passthrough = [
    "participant_id", "participant_name",
    "bug_title", "steps_to_reproduce", "expected_behavior", "actual_behavior",
    "screenshot_url",
    "points_awarded", "marshal_notes", "duplicate_of", "is_confirming_duplicate",
  ];
  for (const f of passthrough) {
    if (body[f] !== undefined) out[f] = body[f];
  }

  // Medium fix #4: coerce "" → null so the nullable column is truly NULL in the DB
  if (body.screen_recording_url !== undefined) {
    out.screen_recording_url = body.screen_recording_url === "" ? null : body.screen_recording_url;
  }

  return out;
}

// ── Parse sort string from SDK  ───────────────────────────────
// SDK passes "-created_date" or "created_date" as sort param

function parseSort(sortStr) {
  if (!sortStr) return { createdAt: "desc" };
  const desc = sortStr.startsWith("-");
  const field = sortStr.replace(/^-/, "");
  const dbField = field === "created_date" ? "createdAt" : field;
  return { [dbField]: desc ? "desc" : "asc" };
}

// ── SELECT shape ──────────────────────────────────────────────

const bugSelect = {
  id:                     true,
  module:                 true,
  bug_title:              true,
  steps_to_reproduce:     true,
  expected_behavior:      true,
  actual_behavior:        true,
  screenshot_url:         true,
  screen_recording_url:   true,
  status:                 true,
  severity:               true,
  points_awarded:         true,
  marshal_notes:          true,
  duplicate_of:           true,
  is_confirming_duplicate:true,
  participant_id:         true,
  participant_name:       true,
  createdAt:              true,
  updatedAt:              true,
};

// ============================================================
// GET /entities/BugReport
//   ?q=<JSON>         — SDK's .filter(query,...) sends the query as ?q=
//   ?sort=<string>    — e.g. "-created_date"
//   ?limit=<number>
//
// Auth: authenticate middleware runs before this handler (wired in appRouter).
// Role enforcement:
//   - MARSHAL → can see all bug reports and filter freely
//   - PARTICIPANT → can only see their own reports (filtered by participant_id
//     derived from their checked-in Registration, OR from the ?q filter if they
//     explicitly pass their own participant_id)
// ============================================================

const listBugReports = async (req, res) => {
  const { q, sort, limit = 500 } = req.query;

  const where = {};

  if (q) {
    try {
      const parsed = typeof q === "string" ? JSON.parse(q) : q;

      if (parsed.participant_id) where.participant_id = parsed.participant_id;
      if (parsed.module)         where.module         = MODULE_TO_DB[parsed.module] ?? parsed.module;
      if (parsed.status)         where.status         = STATUS_TO_DB[parsed.status]  ?? parsed.status;
    } catch (_) {
      // malformed filter — ignore and return all
    }
  }

  // Critical fix #1: non-marshal users may only read their own bug reports.
  // If the caller is a PARTICIPANT, force the participant_id filter to their
  // own Registration participant_id (looked up via their User record).
  // This prevents a participant from listing all other participants' reports.
  if (req.user && req.user.role !== "MARSHAL" && req.user.role !== "marshal") {
    // Find the checked-in Registration that belongs to this user's email
    const reg = await prisma.registration.findFirst({
      where: { email: req.user.email, checked_in: true },
      select: { participant_id: true },
    });

    // If no checked-in registration found, return empty list (not an error)
    if (!reg || !reg.participant_id) {
      return res.status(200).json([]);
    }

    // Override any q-supplied participant_id with the authenticated one
    where.participant_id = reg.participant_id;
  }

  const orderBy = parseSort(sort);
  const take    = Number(limit) || 500;

  const rows = await prisma.bugReport.findMany({
    where,
    orderBy,
    take,
    select: bugSelect,
  });

  return res.status(200).json(rows.map(toFrontend));
};

// ============================================================
// POST /entities/BugReport
// ============================================================

const createBugReport = async (req, res) => {
  const data = toDb(req.body);

  // Defaults
  if (!data.status)          data.status          = "PENDING_REVIEW";
  if (data.points_awarded === undefined) data.points_awarded = 0;
  if (data.is_confirming_duplicate === undefined) data.is_confirming_duplicate = false;

  const row = await prisma.bugReport.create({
    data,
    select: bugSelect,
  });

  return res.status(201).json(toFrontend(row));
};

// ============================================================
// PUT/PATCH /entities/BugReport/:id
// ============================================================

const SEVERITY_POINTS = {
  LAUNCH_BLOCKER: 15,
  CRITICAL:       10,
  HIGH:            7,
  MEDIUM:          4,
  LOW:             1,
};

const updateBugReport = async (req, res) => {
  const { id } = req.params;
  const data   = toDb(req.body);

  // Auto-calc points from severity when no explicit override is sent
  if (data.severity && data.points_awarded === undefined) {
    data.points_awarded = SEVERITY_POINTS[data.severity] ?? 0;
  }

  // Auto-set points for status changes
  if (data.status === "DUPLICATE" && data.points_awarded === undefined) data.points_awarded = 0.5;
  if (data.status === "REJECTED"  && data.points_awarded === undefined) data.points_awarded = 0;

  const row = await prisma.bugReport.update({
    where:  { id },
    data,
    select: bugSelect,
  });

  return res.status(200).json(toFrontend(row));
};

// ============================================================
// GET /entities/BugReport/:id
// ============================================================

const getBugReportById = async (req, res) => {
  const { id } = req.params;
  const row = await prisma.bugReport.findUnique({
    where:  { id },
    select: bugSelect,
  });

  if (!row) {
    return res.status(404).json({ success: false, message: "Bug report not found.", data: null });
  }

  return res.status(200).json(toFrontend(row));
};

module.exports = {
  listBugReports,
  createBugReport,
  updateBugReport,
  getBugReportById,
};
