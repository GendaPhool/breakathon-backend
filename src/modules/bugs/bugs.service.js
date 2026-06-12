// ============================================================
// src/modules/bugs/bugs.service.js
// Bug report business logic for Break-A-Thon
// ============================================================

const prisma = require("../../config/db");

const notFound = () => {
  const err = new Error("Bug report not found.");
  err.statusCode = 404;
  return err;
};

const forbidden = (msg = "Access denied.") => {
  const err = new Error(msg);
  err.statusCode = 403;
  return err;
};

const bugSelect = {
  id: true,
  module: true,
  bug_title: true,
  steps_to_reproduce: true,
  expected_behavior: true,
  actual_behavior: true,
  screenshot_url: true,
  screen_recording_url: true,
  status: true,
  severity: true,
  points_awarded: true,
  marshal_notes: true,
  duplicate_of: true,
  is_confirming_duplicate: true,
  participant_id: true,
  participant_name: true,
  createdAt: true,
  updatedAt: true,
};

// ─── 1. Create bug report (participant) ───────────────────────

const createBug = async (data) => {
  return prisma.bugReport.create({
    data: {
      module: data.module,
      bug_title: data.bug_title,
      steps_to_reproduce: data.steps_to_reproduce,
      expected_behavior: data.expected_behavior,
      actual_behavior: data.actual_behavior,
      screenshot_url: data.screenshot_url,
      screen_recording_url: data.screen_recording_url || null,
      status: "PENDING_REVIEW",
      points_awarded: 0,
      is_confirming_duplicate: data.is_confirming_duplicate || false,
      participant_id: data.participant_id,
      participant_name: data.participant_name,
    },
    select: bugSelect,
  });
};

// ─── 2. List bug reports ──────────────────────────────────────

const getBugs = async (user, query) => {
  const {
    page = 1,
    limit = 500,
    status,
    module: bugModule,
    participant_id,
    search,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};

  // Participants only see their own reports (for MyReports page uses participant_id filter)
  if (user.role === "PARTICIPANT") {
    where.participant_id = user.id;
  } else if (participant_id) {
    // Marshal filtering by specific participant
    where.participant_id = participant_id;
  }

  if (status) where.status = status;
  if (bugModule) where.module = bugModule;

  if (search) {
    where.OR = [
      { bug_title: { contains: search, mode: "insensitive" } },
      { steps_to_reproduce: { contains: search, mode: "insensitive" } },
      { participant_name: { contains: search, mode: "insensitive" } },
    ];
  }

  const [bugs, total] = await prisma.$transaction([
    prisma.bugReport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: bugSelect,
    }),
    prisma.bugReport.count({ where }),
  ]);

  return { bugs, pagination: { page: Number(page), limit: take, total } };
};

// ─── 3. Get bug by ID ─────────────────────────────────────────

const getBugById = async (id, user) => {
  const bug = await prisma.bugReport.findUnique({ where: { id }, select: bugSelect });

  if (!bug) throw notFound();

  if (user.role === "PARTICIPANT" && bug.participant_id !== user.id) {
    throw forbidden("You can only view your own bug reports.");
  }

  return bug;
};

// ─── 4. Update bug (participant edits own, marshal edits any) ─

const updateBug = async (id, data, user) => {
  const bug = await prisma.bugReport.findUnique({
    where: { id },
    select: { id: true, participant_id: true, status: true },
  });

  if (!bug) throw notFound();

  if (user.role === "PARTICIPANT") {
    if (bug.participant_id !== user.id) throw forbidden("You can only edit your own bug reports.");

    const participantFields = [
      "bug_title", "steps_to_reproduce", "expected_behavior",
      "actual_behavior", "screen_recording_url",
    ];
    const updateData = {};
    for (const f of participantFields) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }
    return prisma.bugReport.update({ where: { id }, data: updateData, select: bugSelect });
  }

  // Marshal: all fields
  const marshalFields = [
    "severity", "points_awarded", "marshal_notes",
    "duplicate_of", "is_confirming_duplicate",
  ];
  const updateData = {};
  for (const f of marshalFields) {
    if (data[f] !== undefined) updateData[f] = data[f];
  }
  return prisma.bugReport.update({ where: { id }, data: updateData, select: bugSelect });
};

// ─── 5. Change status (marshal only, separate endpoint) ───────

const changeBugStatus = async (id, { status }, marshalId) => {
  const bug = await prisma.bugReport.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!bug) throw notFound();

  // Auto-set points for duplicate
  const extra = {};
  if (status === "DUPLICATE") extra.points_awarded = 0.5;
  if (status === "REJECTED") extra.points_awarded = 0;

  return prisma.bugReport.update({
    where: { id },
    data: { status, ...extra },
    select: bugSelect,
  });
};

// ─── 6. Verify participant — takes fetamal-id, checks checked_in ─

const verifyParticipant = async (participant_id) => {
  const reg = await prisma.registration.findFirst({
    where: { participant_id },
    select: {
      id: true,
      name: true,
      participant_id: true,
      payment_status: true,
      checked_in: true,
      checked_in_at: true,
    },
  });

  if (!reg) {
    const err = new Error("Participant not found.");
    err.statusCode = 404;
    throw err;
  }

  return reg;
};

// ─── 7. Leaderboard — aggregated by participant ───────────────

const getLeaderboard = async () => {
  const reports = await prisma.bugReport.findMany({
    select: {
      participant_id: true,
      participant_name: true,
      points_awarded: true,
      status: true,
    },
  });

  const map = {};
  for (const r of reports) {
    if (!map[r.participant_id]) {
      map[r.participant_id] = {
        participant_id: r.participant_id,
        participant_name: r.participant_name,
        total_points: 0,
        reports_submitted: 0,
        reports_validated: 0,
      };
    }
    map[r.participant_id].reports_submitted += 1;
    map[r.participant_id].total_points += r.points_awarded || 0;
    if (r.status === "VALIDATED") map[r.participant_id].reports_validated += 1;
  }

  return Object.values(map).sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return b.reports_validated - a.reports_validated;
  });
};

module.exports = {
  createBug,
  getBugs,
  getBugById,
  updateBug,
  changeBugStatus,
  verifyParticipant,
  getLeaderboard,
};
