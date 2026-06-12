// ============================================================
// src/modules/razorpay/razorpay.routes.js
// POST /api/v1/payment/order  — create a Razorpay order
// ============================================================

const { Router } = require("express");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

const router = Router();

/**
 * POST /api/v1/payment/order
 * Body: { amount_paise: number }   (e.g. 14900 = ₹149)
 * Returns Razorpay order object + key_id for frontend checkout
 */
router.post("/order", async (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return sendError(res, "Razorpay credentials not configured.", 500);
  }

  const amount = req.body.amount_paise || 14900; // ₹149 default
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
    amount: order.amount,
    currency: order.currency,
    key_id: keyId,
  });
});

/**
 * POST /api/v1/payment/confirm
 * Called after successful payment to update registration payment_reference.
 * Body: { registration_id, razorpay_payment_id }
 */
router.post("/confirm", async (req, res) => {
  const { registration_id, razorpay_payment_id } = req.body;

  if (!registration_id || !razorpay_payment_id) {
    return sendError(res, "registration_id and razorpay_payment_id are required.", 400);
  }

  const prisma = require("../../config/db");
  const registration = await prisma.registration.update({
    where: { id: registration_id },
    data: { payment_reference: razorpay_payment_id },
  });

  return sendSuccess(res, "Payment reference saved.", { registration });
});

module.exports = router;
