-- Trace des relances faites depuis l'interface (ajout seul : aucune donnée existante modifiée).

-- CreateEnum
CREATE TYPE "ReminderTarget" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "ReminderReason" AS ENUM ('OWNER_FORM', 'TENANT_TO_ADD', 'TENANT_FORM', 'TENANT_VIA_OWNER', 'MISSING_ITEMS', 'RENT_CAP');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'CALL', 'SNOOZE');

-- CreateTable
CREATE TABLE "BailReminder" (
    "id" TEXT NOT NULL,
    "bailId" TEXT NOT NULL,
    "clientId" TEXT,
    "target" "ReminderTarget" NOT NULL,
    "reason" "ReminderReason" NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "recipientEmail" TEXT,
    "items" JSONB,
    "note" TEXT,
    "snoozeUntil" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BailReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BailReminder_bailId_createdAt_idx" ON "BailReminder"("bailId", "createdAt");

-- AddForeignKey
ALTER TABLE "BailReminder" ADD CONSTRAINT "BailReminder_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

