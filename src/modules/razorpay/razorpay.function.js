// ============================================================
// src/modules/razorpay/razorpay.function.js
// Mounted at: POST /api/apps/:appId/functions/createRazorpayOrder
//             POST /api/apps/:appId/functions/verifyRazorpayPayment
// ============================================================

const { Router } = require("express");
const crypto     = require("crypto");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

const router = Router();

// ── Create Order ──────────────────────────────────────────────
router.post("/", async (req, res) => {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return sendError(res, "Razorpay credentials not configured.", 500);
  }

  const amount      = 14900; // ₹149 fixed (paise)
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `reg_${Date.now()}`,
    }),
  });

  const order = await orderRes.json();

  if (!orderRes.ok) {
    return sendError(res, order?.error?.description || "Failed to create Razorpay order.", 400);
  }

  return sendSuccess(res, "Order created.", {
    order_id: order.id,
    amount:   order.amount,
    currency: order.currency,
    key_id:   keyId,
  });
});

// ── Verify Payment Signature ──────────────────────────────────
// Called after the Razorpay checkout handler fires.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Returns: { verified: true, payment_id } on success, 400 on bad signature.
router.post("/verify", async (req, res) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return sendError(res, "Razorpay credentials not configured.", 500);
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendError(res, "Missing required payment fields.", 400);
  }

  // HMAC-SHA256 signature check (Razorpay spec)
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return sendError(res, "Payment signature verification failed.", 400);
  }

  return sendSuccess(res, "Payment verified.", {
    verified:   true,
    payment_id: razorpay_payment_id,
  });
});

module.exports = router;
