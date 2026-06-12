-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MARSHAL', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('PENDING_REVIEW', 'VALIDATED', 'REJECTED', 'NEEDS_MORE_INFO', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('LAUNCH_BLOCKER', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "BugCategory" AS ENUM ('CUSTOMER_APP', 'ADMIN_DASHBOARD', 'DELIVERY_PARTNER_APP', 'PRODUCTION_DASHBOARD', 'ROUTE_MANAGEMENT', 'SUBSCRIPTION_MANAGEMENT', 'PAYMENT_SYSTEM', 'WALLET_SYSTEM', 'NOTIFICATION_SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PARTICIPANT',
    "full_name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "how_did_you_hear" TEXT NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMP(3),
    "participant_id" TEXT,
    "badge_printed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_reports" (
    "id" TEXT NOT NULL,
    "module" "BugCategory" NOT NULL,
    "bug_title" TEXT NOT NULL,
    "steps_to_reproduce" TEXT NOT NULL,
    "expected_behavior" TEXT NOT NULL,
    "actual_behavior" TEXT NOT NULL,
    "screenshot_url" TEXT NOT NULL,
    "screen_recording_url" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "severity" "BugSeverity",
    "points_awarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marshal_notes" TEXT,
    "duplicate_of" TEXT,
    "is_confirming_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "participant_id" TEXT NOT NULL,
    "participant_name" TEXT NOT NULL,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_settings" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL DEFAULT 'Genda Phool Break-A-Thon',
    "event_date" TEXT,
    "event_time" TEXT,
    "venue" TEXT,
    "upi_id" TEXT,
    "upi_qr_url" TEXT,
    "registration_open" BOOLEAN NOT NULL DEFAULT true,
    "event_started" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_email_key" ON "registrations"("email");
