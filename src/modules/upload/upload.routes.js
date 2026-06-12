// ============================================================
// src/modules/upload/upload.routes.js
// Multipart file upload — image/video
// Accepts: screenshot (required), screen_recording (optional)
// Returns: { file_url: "..." }
// ============================================================

const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

const router = Router();

// Storage config: local disk at /uploads  (swap for S3 in production)
const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
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

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter,
});

/**
 * POST /api/v1/upload
 * multipart/form-data  field: "file"
 * Returns { file_url }
 */
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return sendError(res, "No file uploaded.", 400);
  }

  const host = `${req.protocol}://${req.get("host")}`;
  const file_url = `${host}/uploads/${req.file.filename}`;

  return sendSuccess(res, "File uploaded.", { file_url });
});

module.exports = router;
