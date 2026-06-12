// ============================================================
// src/modules/registrations/registrations.public.service.js
// Handles only public (unauthenticated) registration operations
// needed by the Base44 adapter layer.
// ============================================================

const prisma = require("../../config/db");

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
 * The frontend calls: base44.entities.Registration.filter({ email })
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
