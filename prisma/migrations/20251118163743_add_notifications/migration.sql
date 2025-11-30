-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('COMMENT_CREATED', 'CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED', 'PROPERTY_CREATED', 'PROPERTY_UPDATED', 'PROPERTY_DELETED', 'BAIL_CREATED', 'BAIL_UPDATED', 'BAIL_DELETED', 'BAIL_STATUS_CHANGED', 'INTAKE_SUBMITTED', 'INTAKE_REVOKED', 'COMPLETION_STATUS_CHANGED');

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "recipientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_idx" ON "public"."Notification"("recipientId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "public"."Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_targetType_targetId_idx" ON "public"."Notification"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
