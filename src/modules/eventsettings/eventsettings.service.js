// ============================================================
// src/modules/eventsettings/eventsettings.service.js
// ============================================================

const prisma = require("../../config/db");

// Medium fix #3: Use a fixed singleton ID so that concurrent requests
// can never race to create two EventSettings rows. prisma.upsert is
// atomic (single SQL UPSERT) — no more find-then-create race condition.
const SINGLETON_ID = "singleton";

const settingsSelect = {
  id: true,
  event_name: true,
  event_date: true,
  event_time: true,
  venue: true,
  upi_id: true,
  upi_qr_url: true,
  registration_open: true,
  event_started: true,
  createdAt: true,
  updatedAt: true,
};

const getSettings = async () => {
  const settings = await prisma.eventSettings.findFirst({ select: settingsSelect });
  return settings;
};

const upsertSettings = async (data) => {
  const payload = {
    event_name:        data.event_name,
    event_date:        data.event_date,
    event_time:        data.event_time,
    venue:             data.venue,
    upi_id:            data.upi_id,
    upi_qr_url:        data.upi_qr_url,
    registration_open: data.registration_open,
    event_started:     data.event_started,
  };

  // Atomic upsert: if the singleton row exists → update; otherwise → create.
  // No race condition because Prisma compiles this to a single SQL UPSERT.
  return prisma.eventSettings.upsert({
    where:  { id: SINGLETON_ID },
    update: payload,
    create: { id: SINGLETON_ID, ...payload },
    select: settingsSelect,
  });
};

module.exports = { getSettings, upsertSettings };
