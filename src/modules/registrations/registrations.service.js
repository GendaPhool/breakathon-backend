// ============================================================
// src/modules/registrations/registrations.service.js
// ============================================================

const prisma = require("../../config/db");

const notFound = () => {
  const err = new Error("Registration not found.");
  err.statusCode = 404;
  return err;
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

// ─── List all registrations (Marshal only) ───────────────────

const listRegistrations = async (query = {}) => {
  const { payment_status } = query;
  const where = {};
  if (payment_status) where.payment_status = payment_status;

  return prisma.registration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: regSelect,
  });
};

// ─── Search registrations by name, phone, participant_id ─────

const searchRegistrations = async (q) => {
  if (!q || !q.trim()) return [];
  const term = q.trim();
  return prisma.registration.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
        { participant_id: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: regSelect,
  });
};

// ─── Create registration (public) ────────────────────────────

const createRegistration = async (data) => {
  const existing = await prisma.registration.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });
  if (existing) {
    const err = new Error("An account with this email is already registered.");
    err.statusCode = 409;
    throw err;
  }

  return prisma.registration.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone.replace(/\s/g, ""),
      city: data.city,
      occupation: data.occupation,
      how_did_you_hear: data.how_did_you_hear,
      payment_reference: data.payment_reference,
      payment_status: "PENDING_VERIFICATION",
      checked_in: false,
      badge_printed: false,
    },
    select: regSelect,
  });
};

// ─── Generic update (Marshal) ─────────────────────────────────

const updateRegistration = async (id, data) => {
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw notFound();

  const allowed = [
    "payment_status", "participant_id", "checked_in",
    "checked_in_at", "badge_printed",
  ];
  const updateData = {};
  for (const field of allowed) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  return prisma.registration.update({ where: { id }, data: updateData, select: regSelect });
};

// ─── Verify payment: auto-generate GP-XXX participant_id ─────

const verifyRegistration = async (id, existingRegistrations) => {
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw notFound();

  // Generate next GP-XXX participant_id
  const verified = existingRegistrations.filter(
    (r) => r.payment_status === "VERIFIED" && r.participant_id
  );
  const nums = verified.map((r) => {
    const m = r.participant_id?.match(/GP-(\d+)/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const participant_id = `GP-${String(next).padStart(3, "0")}`;

  return prisma.registration.update({
    where: { id },
    data: { payment_status: "VERIFIED", participant_id },
    select: regSelect,
  });
};

// ─── Reject payment ───────────────────────────────────────────

const rejectRegistration = async (id) => {
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw notFound();

  return prisma.registration.update({
    where: { id },
    data: { payment_status: "REJECTED" },
    select: regSelect,
  });
};

// ─── Toggle badge printed ─────────────────────────────────────

const toggleBadge = async (id) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
    select: { id: true, badge_printed: true },
  });
  if (!reg) throw notFound();

  return prisma.registration.update({
    where: { id },
    data: { badge_printed: !reg.badge_printed },
    select: regSelect,
  });
};

// ─── Check-in ─────────────────────────────────────────────────

const checkInRegistration = async (id) => {
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw notFound();

  if (reg.payment_status !== "VERIFIED") {
    const err = new Error("Only verified participants can be checked in.");
    err.statusCode = 400;
    throw err;
  }

  return prisma.registration.update({
    where: { id },
    data: { checked_in: true, checked_in_at: new Date() },
    select: regSelect,
  });
};

// ─── Get by participant_id (GP-001 format) ────────────────────

const getRegistrationByParticipantId = async (participant_id) => {
  const reg = await prisma.registration.findFirst({
    where: { participant_id },
    select: regSelect,
  });
  if (!reg) throw notFound();
  return reg;
};

module.exports = {
  listRegistrations,
  searchRegistrations,
  createRegistration,
  updateRegistration,
  verifyRegistration,
  rejectRegistration,
  toggleBadge,
  checkInRegistration,
  getRegistrationByParticipantId,
};
