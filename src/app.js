// ============================================================
// src/app.js
// Express Application Setup — Break-A-Thon backend
// ============================================================

require("express-async-errors");

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const path    = require("path");

const env = require("./config/env");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ── Security ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  // Deployment checklist: add your production frontend domain here before go-live.
  // e.g. "https://yourevent.com" — do NOT leave only localhost in prod.
  origin: [env.CLIENT_URL, "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-App-Id"],
}));

// ── Logging ───────────────────────────────────────────────────
app.use(morgan(env.isDev ? "dev" : "combined"));

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Static: uploaded files ────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Health Check ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Break-A-Thon API is running.",
    data: { environment: env.NODE_ENV, timestamp: new Date().toISOString() },
  });
});

// ── Routes ────────────────────────────────────────────────────
const authRoutes          = require("./modules/auth/auth.routes");
const bugRoutes           = require("./modules/bugs/bugs.routes");
const registrationRoutes  = require("./modules/registrations/registrations.routes");
const eventSettingsRoutes = require("./modules/eventsettings/eventsettings.routes");
const uploadRoutes        = require("./modules/upload/upload.routes");
const razorpayRoutes      = require("./modules/razorpay/razorpay.routes");
const base44Router        = require("./routes/base44Router");
const { getSettings }     = require("./modules/eventsettings/eventsettings.controller");

// Existing /api/v1 routes — kept intact
app.use("/api/v1/auth",          authRoutes);
app.use("/api/v1/bugs",          bugRoutes);
app.use("/api/v1/registrations", registrationRoutes);
app.use("/api/v1/settings",      eventSettingsRoutes);
app.use("/api/v1/upload",        uploadRoutes);
app.use("/api/v1/payment",       razorpayRoutes);

// ── Base44 SDK: static public route ──────────────────────────
// MUST be registered BEFORE the dynamic /api/apps/:appId mount.
// AuthContext calls this before it knows the appId, so Express
// would treat "public" as the :appId param and miss it otherwise.
//
// GET /api/apps/public/prod/public-settings/by-id/:appId
app.get("/api/apps/public/prod/public-settings/by-id/:appId", getSettings);

// Base44 SDK adapter — handles /api/apps/:appId/* from the frontend
app.use("/api/apps/:appId", base44Router);

// ── Error Handlers (must be last) ────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
