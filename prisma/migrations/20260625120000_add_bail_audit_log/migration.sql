CREATE TYPE "BailAuditEventType" AS ENUM (
  'BAIL_CREATED',
  'PAYMENT_RECEIVED',
  'TENANT_ADDED',
  'TENANT_FORM_SUBMITTED',
  'STATUS_CHANGED',
  'NOTAIRE_ASSIGNED'
);

CREATE TABLE "BailAuditLog" (
  "id" TEXT NOT NULL,
  "bailId" TEXT NOT NULL,
  "eventType" "BailAuditEventType" NOT NULL,
  "fromStatus" "BailStatus",
  "toStatus" "BailStatus",
  "tenantId" TEXT,
  "tenantName" TEXT,
  "notaireId" TEXT,
  "notaireName" TEXT,
  "actorId" TEXT,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BailAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BailAuditLog_bailId_createdAt_idx" ON "BailAuditLog"("bailId", "createdAt");
CREATE INDEX "BailAuditLog_eventType_idx" ON "BailAuditLog"("eventType");
CREATE INDEX "BailAuditLog_actorId_idx" ON "BailAuditLog"("actorId");

ALTER TABLE "BailAuditLog"
ADD CONSTRAINT "BailAuditLog_bailId_fkey"
FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BailAuditLog"
ADD CONSTRAINT "BailAuditLog_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
