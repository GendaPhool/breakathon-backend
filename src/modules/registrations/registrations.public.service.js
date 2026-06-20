// ============================================================
// src/modules/registrations/registrations.public.service.js
// Handles only public (unauthenticated) registration operations
// needed by the entity adapter layer.
// ============================================================

const prisma = require("../../config/db");

// Single hardcoded code that allows registering without a real Razorpay payment.
// Anything else must be a real, captured Razorpay payment_id verified against their API.
const FREE_ACCESS_CODE = "gpbreakuserfree123";
const RAZORPAY_PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]{10,}$/;

/**
 * Confirms payment_reference is either the hardcoded free-access code, or a real
 * Razorpay payment that actually succeeded — fetched live from Razorpay's API.
 * This blocks anyone from typing a random string (or a plausible-looking fake
 * "pay_..." string) directly into the registration form/API and getting in for free.
 */
const verifyPaymentReference = async (rawReference) => {
  const reference = (rawReference || "").trim();

  if (reference === FREE_ACCESS_CODE) {
    return { valid: true };
  }

  if (!RAZORPAY_PAYMENT_ID_PATTERN.test(reference)) {
    return { valid: false };
  }

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { valid: false };
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${reference}`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) return { valid: false };

  const payment = await res.json();
  const validStatuses = ["captured", "authorized"];
  if (!validStatuses.includes(payment.status)) {
    return { valid: false };
  }

  return { valid: true };
};

const regSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  city: true,
  occupation: true,
  how_did_you_hear: true,
  payment_reference: true,
  payment_status: true,
  checked_in: true,
  checked_in_at: true,
  participant_id: true,
  badge_printed: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Filter registrations by a single field:value pair.
 * The frontend calls: apiClient.entities.Registration.filter({ email })
 * which maps to GET /entities/Registration?filter[email]=...
 */
const filterRegistrations = async (filterParams = {}) => {
  const where = {};

  if (filterParams.email) {
    where.email = filterParams.email.toLowerCase().trim();
  }
  // Future: extend for other filterable fields here

  return prisma.registration.findMany({
    where,
    select: regSelect,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Create a new registration (public, unauthenticated).
 * Enforces email uniqueness and hard-codes server-side safe values.
 */
const createPublicRegistration = async (data) => {
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.registration.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("EMAIL_EXISTS");
    err.statusCode = 409;
    err.clientMessage = "An account with this email is already registered.";
    throw err;
  }

  const { valid } = await verifyPaymentReference(data.payment_reference);
  if (!valid) {
    const err = new Error("INVALID_PAYMENT_ID");
    err.statusCode = 400;
    err.clientMessage = "Invalid Payment ID. Please complete payment via Razorpay, or contact support.";
    throw err;
  }

  return prisma.registration.create({
    data: {
      name:              data.name.trim(),
      email,
      phone:             data.phone.replace(/\s/g, ""),
      city:              data.city.trim(),
      occupation:        data.occupation,
      how_did_you_hear:  data.how_did_you_hear,
      payment_reference: data.payment_reference.trim(),
      // Always override these regardless of what the frontend sends:
      payment_status:    "PENDING_VERIFICATION",
      checked_in:        false,
      badge_printed:     false,
    },
    select: regSelect,
  });
};

module.exports = { filterRegistrations, createPublicRegistration };
