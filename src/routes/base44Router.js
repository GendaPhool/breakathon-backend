// ============================================================
// src/routes/base44Router.js
// Adapter layer — maps Base44 SDK URL patterns to existing handlers.
// Frontend calls: /api/apps/:appId/auth/*, /api/apps/:appId/entities/*, etc.
//
// RESPONSE SHAPE RULES (Base44 SDK expectations):
//   .list() / .filter()  → expects a raw JSON array:  [...]
//   .create()            → expects the created object: {...}
//   .update()            → expects the updated object: {...}
//   auth.login()         → expects `access_token` at TOP LEVEL of response
//   auth.me()            → expects user object directly in `data` (not data.user)
//                          returns { data: null } (not 401) when no token present
//
// DO NOT put business logic here.
// ============================================================

const { Router } = require("express");
const { authenticate } = require("../middleware/auth");
const { requireMarshal } = require("../middleware/role");
const { validateBodyZod } = require("../middleware/validate");
const { verifyAccessToken } = require("../utils/jwt");

// ── Auth ──────────────────────────────────────────────────────
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../modules/auth/auth.validation");

const {
  register,
  forgotPassword,
  resetPassword,
} = require("../modules/auth/auth.controller");

const authService = require("../modules/auth/auth.service");

// ── Registration ──────────────────────────────────────────────
const { createRegistrationSchema } = require("../modules/registrations/registrations.validation");
const {
  listOrFilterRegistrations,
  createRegistration,
} = require("../modules/registrations/registrations.public.controller");

// ── EventSettings ─────────────────────────────────────────────
const { getSettings } = require("../modules/eventsettings/eventsettings.controller");
const eventsettingsService = require("../modules/eventsettings/eventsettings.service");

// ── BugReport ─────────────────────────────────────────────────
const {
  listBugReports,
  createBugReport,
  updateBugReport,
  getBugReportById,
} = require("../modules/bugs/bugs.entity.controller");

const {
  createBugSchema,
  marshalUpdateSchema,
} = require("../modules/bugs/bugs.validation");

// ── Email ─────────────────────────────────────────────────────
const { sendRegistrationConfirmation } = require("../modules/email/email.service");

// ── Upload ────────────────────────────────────────────────────
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file,  cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  if (allowed.test(ext)) return cb(null, true);
  cb(new Error("Only image and video files are allowed."));
};

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });

// ── Prisma ────────────────────────────────────────────────────
const prisma = require("../config/db");

const router = Router();

// ── All routes scoped under /api/apps/:appId by app.js ────────

// ── Soft auth helper ──────────────────────────────────────────
// Returns the decoded user if a valid Bearer token is present,
// or null if missing/invalid — never throws.
const softAuth = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    return await authService.getMe(decoded.id);
  } catch (_) {
    return null;
  }
};

// =============================================================
// AUTH
// =============================================================

// LOGIN — SDK reads `access_token` at TOP LEVEL (not inside data.token)
router.post("/auth/login", validateBodyZod(loginSchema), async (req, res, next) => {
  try {
    const { user, token } = await authService.loginUser(req.body);
    return res.status(200).json({ access_token: token, user });
  } catch (err) {
    next(err);
  }
});

// Medium fix #1: /auth/register is dead in the UI (redirected to /login in App.jsx)
// but was live on the backend — a latent privilege-escalation path (any PARTICIPANT
// account can call authenticate-only routes). Hard-block it here.
// To create marshals, use scripts/seedMarshal.js instead.
router.post("/auth/register", (_req, res) =>
  res.status(403).json({
    success: false,
    message: "Self-registration is disabled for this event. Please contact the organisers.",
    data: null,
  })
);

// ME — auth.me() does axios.get('/entities/User/me') and the axios
// interceptor returns response.data RAW (no further unwrapping). Home.jsx
// reads `user?.role` and MarshalGate reads `me.role !== "marshal"` directly
// on this object — so it MUST be the user object itself, not wrapped in
// {success, data}. When no token, return a generic participant identity
// with 200 (NOT 401) so ProtectedRoute lets anonymous visitors through —
// ParticipantGateWrapper/MarshalGateWrapper handle the real per-page checks.
const ANONYMOUS_USER = {
  id: "anonymous",
  name: "Participant",
  full_name: "Participant",
  email: "",
  role: "participant",
  marshal: false,
  isActive: true,
};

router.get("/auth/me", async (req, res) => {
  const user = await softAuth(req);
  return res.status(200).json(user || ANONYMOUS_USER);
});

// LOGOUT (POST) — for direct callers
router.post("/auth/logout", (_req, res) =>
  res.status(200).json({ success: true, message: "Logged out.", data: null })
);

// LOGOUT (GET) — SDK calls GET /auth/logout?from_url=<page> after clearing
// localStorage token; redirect back so browser lands on the right page.
router.get("/auth/logout", (req, res) => {
  const fromUrl = req.query.from_url || "http://localhost:5173";
  return res.redirect(302, fromUrl);
});

router.post("/auth/reset-password-request", validateBodyZod(forgotPasswordSchema), forgotPassword);
router.post("/auth/reset-password",         validateBodyZod(resetPasswordSchema),  resetPassword);

// Public settings — called by AuthContext on load
router.get("/public-settings/by-id/:appId", getSettings);

// =============================================================
// ENTITY: User
// =============================================================

// SDK calls GET /entities/User/me to hydrate the logged-in user
// Same raw-object pattern as /auth/me — see comment above.
router.get("/entities/User/me", async (req, res) => {
  const user = await softAuth(req);
  return res.status(200).json(user || ANONYMOUS_USER);
});

// =============================================================
// ENTITY: EventSettings
// SDK expects raw array for list, raw object for create/update
// =============================================================

const settingsToFrontend = (row) => {
  if (!row) return null;
  return {
    id:                row.id,
    event_name:        row.event_name,
    event_date:        row.event_date        ?? "",
    event_time:        row.event_time        ?? "",
    venue:             row.venue             ?? "",
    upi_id:            row.upi_id            ?? "",
    upi_qr_url:        row.upi_qr_url        ?? "",
    registration_open: row.registration_open,
    event_started:     row.event_started,
    created_date:      row.createdAt?.toISOString?.() ?? row.createdAt ?? null,
    updated_date:      row.updatedAt?.toISOString?.() ?? row.updatedAt ?? null,
  };
};

// LIST — AdminSettings calls EventSettings.list() → picks [0]
// Must return raw array, NOT wrapped in sendSuccess
router.get("/entities/EventSettings", async (_req, res, next) => {
  try {
    const settings = await eventsettingsService.getSettings();
    return res.status(200).json(settings ? [settingsToFrontend(settings)] : []);
  } catch (err) {
    next(err);
  }
});

// CREATE — AdminSettings calls EventSettings.create(form) when no id yet
// requireMarshal() ensures only MARSHAL-role JWTs can modify settings
router.post("/entities/EventSettings", authenticate, requireMarshal(), async (req, res, next) => {
  try {
    const settings = await eventsettingsService.upsertSettings(req.body);
    return res.status(201).json(settingsToFrontend(settings));
  } catch (err) {
    next(err);
  }
});

// UPDATE — AdminSettings calls EventSettings.update(id, form)
router.put("/entities/EventSettings/:id", authenticate, requireMarshal(), async (req, res, next) => {
  try {
    const settings = await eventsettingsService.upsertSettings(req.body);
    return res.status(200).json(settingsToFrontend(settings));
  } catch (err) {
    next(err);
  }
});

router.patch("/entities/EventSettings/:id", authenticate, requireMarshal(), async (req, res, next) => {
  try {
    const settings = await eventsettingsService.upsertSettings(req.body);
    return res.status(200).json(settingsToFrontend(settings));
  } catch (err) {
    next(err);
  }
});

// =============================================================
// ENTITY: Registration
// SDK expects raw array for list/filter, raw object for create/update
// =============================================================

const PAYMENT_STATUS_FROM_DB = {
  PENDING_VERIFICATION: "Pending Verification",
  VERIFIED:             "Verified",
  REJECTED:             "Rejected",
};

const PAYMENT_STATUS_TO_DB = {
  "Pending Verification": "PENDING_VERIFICATION",
  "Verified":             "VERIFIED",
  "Rejected":             "REJECTED",
};

const regToFrontend = (row) => ({
  id:                row.id,
  name:              row.name,
  email:             row.email,
  phone:             row.phone,
  city:              row.city,
  occupation:        row.occupation,
  how_did_you_hear:  row.how_did_you_hear,
  payment_reference: row.payment_reference,
  payment_status:    PAYMENT_STATUS_FROM_DB[row.payment_status] ?? row.payment_status,
  checked_in:        row.checked_in,
  checked_in_at:     row.checked_in_at?.toISOString?.() ?? row.checked_in_at ?? null,
  participant_id:    row.participant_id ?? null,
  badge_printed:     row.badge_printed,
  created_date:      row.createdAt?.toISOString?.() ?? row.createdAt ?? null,
  updated_date:      row.updatedAt?.toISOString?.() ?? row.updatedAt ?? null,
});

const regSelect = {
  id: true, name: true, email: true, phone: true, city: true,
  occupation: true, how_did_you_hear: true, payment_reference: true,
  payment_status: true, checked_in: true, checked_in_at: true,
  participant_id: true, badge_printed: true, createdAt: true, updatedAt: true,
};

// LIST / FILTER — handles both .list(sort, limit) and .filter({ email, phone })
// The Base44 SDK's entities.X.filter(query, ...) ALWAYS sends ?q=<JSON> —
// never ?filters= or ?filter[x]=. (Verified directly in @base44/sdk source.)
//
// ⚠️  Medium Issue #6 (from audit): This route is intentionally unauthenticated
// because ParticipantGate.jsx needs it before a participant has a JWT. However,
// it returns PII (name, email, phone, city, payment_reference) for all rows when
// called without a ?q filter. Mitigate at the infrastructure level (firewall /
// reverse-proxy) to restrict calls from public internet if possible, or add
// network-layer rate-limiting. Tightening it in code would require frontend changes.
router.get("/entities/Registration", async (req, res, next) => {
  try {
    const { q, sort, limit = 500 } = req.query;
    const where = {};

    if (q) {
      try {
        const parsed = typeof q === "string" ? JSON.parse(q) : q;
        if (parsed.email)          where.email          = parsed.email.toLowerCase().trim();
        if (parsed.phone)          where.phone          = parsed.phone.replace(/\s/g, "");
        if (parsed.payment_status) where.payment_status = PAYMENT_STATUS_TO_DB[parsed.payment_status] ?? parsed.payment_status;
        if (parsed.participant_id) where.participant_id = parsed.participant_id;
      } catch (_) { /* ignore malformed q */ }
    }

    let orderBy = { createdAt: "desc" };
    if (sort) {
      const desc    = sort.startsWith("-");
      const field   = sort.replace(/^-/, "");
      const dbField = field === "created_date" ? "createdAt" : field;
      orderBy = { [dbField]: desc ? "desc" : "asc" };
    }

    const rows = await prisma.registration.findMany({
      where,
      orderBy,
      take:   Number(limit) || 500,
      select: regSelect,
    });

    return res.status(200).json(rows.map(regToFrontend));
  } catch (err) {
    next(err);
  }
});

// CREATE — PublicRegister calls Registration.create({ ...form })
router.post("/entities/Registration", validateBodyZod(createRegistrationSchema), createRegistration);

// ── Shared handler for PUT + PATCH ────────────────────────────
// MarshalRegistrations (verify/reject) and MarshalCheckin (check-in, badge)
const handleRegistrationUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body   = req.body;

    const allowed = [
      "payment_status", "participant_id",
      "checked_in", "checked_in_at", "badge_printed",
    ];

    const data = {};
    for (const field of allowed) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    // Translate payment_status human-readable → DB enum
    if (data.payment_status) {
      data.payment_status = PAYMENT_STATUS_TO_DB[data.payment_status] ?? data.payment_status;
    }

    // Auto-generate participant_id when verifying if frontend didn't supply one
    if (data.payment_status === "VERIFIED" && !data.participant_id) {
      const verified = await prisma.registration.findMany({
        where:  { payment_status: "VERIFIED", participant_id: { not: null } },
        select: { participant_id: true },
      });
      const nums = verified.map((r) => {
        const m = r.participant_id?.match(/GP-(\d+)/);
        return m ? parseInt(m[1]) : 0;
      });
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      data.participant_id = `GP-${String(next).padStart(3, "0")}`;
    }

    // Convert checked_in_at ISO string → Date if needed
    if (data.checked_in_at && typeof data.checked_in_at === "string") {
      data.checked_in_at = new Date(data.checked_in_at);
    }

    const row = await prisma.registration.update({
      where:  { id },
      data,
      select: regSelect,
    });

    return res.status(200).json(regToFrontend(row));
  } catch (err) {
    next(err);
  }
};

// requireMarshal() guards marshal-only operations: verify/reject payments, check-in, badge
router.put(   "/entities/Registration/:id", authenticate, requireMarshal(), handleRegistrationUpdate);
router.patch( "/entities/Registration/:id", authenticate, requireMarshal(), handleRegistrationUpdate);

// =============================================================
// ENTITY: BugReport
//
// Auth strategy (from audit):
//   GET  list/single — authenticate (participants see own bugs; marshals see all)
//                      softAuth is used so anonymous callers get [] rather than 401,
//                      but participant filtering is enforced in the controller.
//   POST create       — authenticate + Zod validation + participant_id ↔ Registration check
//   PUT/PATCH update  — authenticate + requireMarshal() (only marshals may update status/severity/points)
// =============================================================

// LIST — participants see only their own; marshals see all
router.get("/entities/BugReport", authenticate, listBugReports);

// CREATE — authenticated participant; validates participant_id against a checked-in Registration
router.post(
  "/entities/BugReport",
  authenticate,
  validateBodyZod(createBugSchema),
  async (req, res, next) => {
    try {
      // Critical fix #2: verify participant_id belongs to a real, checked-in Registration
      const registration = await prisma.registration.findFirst({
        where: {
          participant_id: req.body.participant_id,
          checked_in: true,
        },
        select: { id: true, name: true },
      });

      if (!registration) {
        return res.status(403).json({
          success: false,
          message: "participant_id does not match a checked-in participant.",
          data: null,
        });
      }

      return createBugReport(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// UPDATE — marshal only; Zod validates the update payload
router.put(   "/entities/BugReport/:id", authenticate, requireMarshal(), validateBodyZod(marshalUpdateSchema), updateBugReport);
router.patch( "/entities/BugReport/:id", authenticate, requireMarshal(), validateBodyZod(marshalUpdateSchema), updateBugReport);

// GET single — any authenticated user
router.get(   "/entities/BugReport/:id", authenticate, getBugReportById);

// =============================================================
// ANALYTICS
// =============================================================

// SDK fires background pings — stub to silence 404 noise
router.post("/analytics/track/batch", (_req, res) =>
  res.status(200).json({ success: true })
);

// =============================================================
// INTEGRATIONS: Core.UploadFile
// AdminSettings (marshal, has JWT) calls this for QR upload, AND
// SubmitBug (participant, NO JWT — sessionStorage auth only) calls
// this for bug screenshots/recordings. Must stay public.
// =============================================================

router.post(
  "/integrations/Core/UploadFile",
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded.", data: null });
    }
    const host     = `${req.protocol}://${req.get("host")}`;
    const file_url = `${host}/uploads/${req.file.filename}`;
    return res.status(200).json({ file_url });
  }
);

// =============================================================
// FUNCTIONS
// =============================================================

// ── Send Registration Confirmation Email ──────────────────────
// Called by PublicRegister after successful registration.
// Body: { registration_id, email, name }
router.post("/functions/sendRegistrationConfirmation", async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ success: false, message: "email and name are required." });
  }
  // Non-blocking — fire and forget so the frontend isn't held up
  sendRegistrationConfirmation({ email, name }).catch((err) =>
    console.error("[email] sendRegistrationConfirmation error:", err.message)
  );
  return res.status(200).json({ success: true, message: "Confirmation email queued." });
});

// ── Razorpay: Create Order + Verify Signature ─────────────────
// POST /functions/createRazorpayOrder          → creates Razorpay order
// POST /functions/createRazorpayOrder/verify   → verifies payment signature
const razorpayFunctionRouter = require("../modules/razorpay/razorpay.function");
router.use("/functions/createRazorpayOrder", razorpayFunctionRouter);

module.exports = router;
