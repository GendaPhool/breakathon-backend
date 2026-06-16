// ============================================================
// src/modules/eventsettings/eventsettings.service.js
// ============================================================

const prisma = require("../../config/db");

const SINGLETON_ID = "singleton";

const settingsSelect = {
  id: true,
  event_name: true,
  event_description: true,
  event_date: true,
  event_time: true,
  venue: true,
  registration_fee: true,
  registration_deadline: true,
  max_participants: true,
  event_banner: true,
  upi_id: true,
  upi_qr_url: true,
  registration_open: true,
  event_started: true,
  event_ended: true,
  leaderboard_visible: true,
  createdAt: true,
  updatedAt: true,
};

const getSettings = async () => {
  const settings = await prisma.eventSettings.findFirst({ select: settingsSelect });
  return settings;
};

const upsertSettings = async (data) => {
  const payload = {
    event_name:            data.event_name,
    event_description:     data.event_description     ?? null,
    event_date:            data.event_date             ?? null,
    event_time:            data.event_time             ?? null,
    venue:                 data.venue                  ?? null,
    registration_fee:      data.registration_fee != null ? parseInt(data.registration_fee) || 149 : 149,
    registration_deadline: data.registration_deadline  ?? null,
    max_participants:      data.max_participants != null && data.max_participants !== ""
                             ? parseInt(data.max_participants) || null
                             : null,
    event_banner:          data.event_banner           ?? null,
    upi_id:                data.upi_id                 ?? null,
    upi_qr_url:            data.upi_qr_url             ?? null,
    registration_open:     data.registration_open,
    event_started:         data.event_started,
    event_ended:           data.event_ended            ?? false,
    leaderboard_visible:   data.leaderboard_visible    !== false,
  };

  return prisma.eventSettings.upsert({
    where:  { id: SINGLETON_ID },
    update: payload,
    create: { id: SINGLETON_ID, ...payload },
    select: settingsSelect,
  });
};

module.exports = { getSettings, upsertSettings };
