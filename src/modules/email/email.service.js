// ============================================================
// src/modules/email/email.service.js
// Sends transactional emails via SMTP (Nodemailer).
//
// Env vars required:
//   SMTP_HOST     e.g. smtp.gmail.com
//   SMTP_PORT     e.g. 587
//   SMTP_USER     sender email address
//   SMTP_PASS     app password / SMTP password
//   SMTP_FROM     "Genda Phool Break-A-Thon <noreply@yourdomain.com>"
// ============================================================

const nodemailer = require("nodemailer");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

async function sendRegistrationConfirmation({ name, email }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured — skipping confirmation for", email);
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({
    from,
    to: email,
    subject: "Registration Confirmed — Genda Phool Break-A-Thon 🎉",
    text: [
      `Hi ${name},`,
      "",
      "Thanks for registering for the Genda Phool Break-A-Thon!",
      "We've received your registration and payment reference. Our team will verify",
      "your payment shortly. Once confirmed you'll receive your Participant ID before the event.",
      "",
      "What happens next:",
      "  1. We verify your payment (usually within a few hours)",
      "  2. You receive your unique Participant ID",
      "  3. Show up on event day, check in at the desk, and start hunting bugs!",
      "",
      "Remember: bring your own laptop or phone — devices are not provided on-site.",
      "",
      "See you at the Break-A-Thon!",
      "— Genda Phool Break-A-Thon Team",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;">
        <h2 style="color:#1e3a5f;margin-bottom:4px;">Genda Phool Break-A-Thon 🐛</h2>
        <p style="color:#555;font-size:14px;margin-top:0;">Registration Confirmed</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thanks for registering! We've received your registration and payment reference.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;font-weight:600;color:#15803d;">✓ Registration received</p>
          <p style="margin:6px 0 0;font-size:13px;color:#166534;">
            Our team will verify your payment shortly. You'll receive your Participant ID once confirmed.
          </p>
        </div>
        <p><strong>What happens next:</strong></p>
        <ol style="padding-left:20px;line-height:1.8;font-size:14px;">
          <li>We verify your payment (usually within a few hours)</li>
          <li>You receive your unique Participant ID via email</li>
          <li>Show up on event day, check in at the desk, and start hunting bugs!</li>
        </ol>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;font-size:13px;color:#1e40af;">
          <strong>📱 Bring Your Own Device</strong><br>
          Please bring your own laptop or phone. Devices will not be provided on-site.
        </div>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px;">— Genda Phool Break-A-Thon Team</p>
      </div>
    `,
  });
  console.log(`[email] Confirmation sent to ${email}`);
}

async function sendVerificationApprovedEmail({ name, email, participant_id }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured — skipping verification email for", email);
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({
    from,
    to: email,
    subject: "You're Verified! — Genda Phool Break-A-Thon ✅",
    text: [
      `Hi ${name},`,
      "",
      "Great news — your payment has been verified and your registration is confirmed!",
      "",
      `Your Participant ID is: ${participant_id}`,
      "",
      "You can now log in to the Break-A-Thon portal using your registered email",
      "and phone number. On event day, visit the check-in desk so a marshal can",
      "check you in — after that you'll be able to submit bug reports.",
      "",
      "See you at the Break-A-Thon!",
      "— Genda Phool Break-A-Thon Team",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;">
        <h2 style="color:#1e3a5f;margin-bottom:4px;">Genda Phool Break-A-Thon 🐛</h2>
        <p style="color:#555;font-size:14px;margin-top:0;">You're Verified ✅</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Great news — your payment has been verified and your registration is confirmed!</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;font-weight:600;color:#15803d;">Your Participant ID</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#166534;">${participant_id}</p>
        </div>
        <p>You can now log in to the Break-A-Thon portal using your registered email and phone number.</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;font-size:13px;color:#1e40af;">
          On event day, visit the check-in desk so a marshal can check you in — after that you'll be able to submit bug reports.
        </div>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px;">— Genda Phool Break-A-Thon Team</p>
      </div>
    `,
  });
  console.log(`[email] Verification approval sent to ${email}`);
}

module.exports = { sendRegistrationConfirmation, sendVerificationApprovedEmail };
