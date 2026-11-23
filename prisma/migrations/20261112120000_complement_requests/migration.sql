-- Demandes de pièces : l'équipe redemande des pièces au propriétaire ou au locataire depuis la
-- fiche du bail. Uniquement des ajouts : deux tables, trois types, une valeur de notification et
-- une colonne facultative sur "Document". Aucune donnée existante n'est modifiée.

-- CreateEnum
CREATE TYPE "ComplementRequestStatus" AS ENUM ('OPEN', 'SUBMITTED', 'ACCEPTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComplementItemStatus" AS ENUM ('PENDING', 'PROVIDED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ComplementReason" AS ENUM ('MISSING', 'ILLEGIBLE', 'EXPIRED', 'WRONG_DOCUMENT', 'INCOMPLETE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMPLEMENT_SUBMITTED';

-- CreateTable
CREATE TABLE "ComplementRequest" (
    "id" TEXT NOT NULL,
    "bailId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "target" "ReminderTarget" NOT NULL,
    "status" "ComplementRequestStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 1,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplementRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "documentKind" "DocumentKind" NOT NULL,
    "label" TEXT NOT NULL,
    "reason" "ComplementReason" NOT NULL DEFAULT 'MISSING',
    "note" TEXT,
    "status" "ComplementItemStatus" NOT NULL DEFAULT 'PENDING',
    "personId" TEXT,
    "entrepriseId" TEXT,
    "clientId" TEXT,
    "propertyId" TEXT,
    "bailId" TEXT,
    "replacesDocumentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplementRequestItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable : colonne facultative, vide pour toutes les pièces existantes
ALTER TABLE "Document" ADD COLUMN "complementItemId" TEXT;

-- CreateIndex
CREATE INDEX "ComplementRequest_bailId_status_idx" ON "ComplementRequest"("bailId", "status");

-- CreateIndex
CREATE INDEX "ComplementRequest_clientId_status_idx" ON "ComplementRequest"("clientId", "status");

-- CreateIndex
CREATE INDEX "ComplementRequestItem_requestId_idx" ON "ComplementRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "Document_complementItemId_idx" ON "Document"("complementItemId");

-- AddForeignKey
ALTER TABLE "ComplementRequest" ADD CONSTRAINT "ComplementRequest_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementRequest" ADD CONSTRAINT "ComplementRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementRequest" ADD CONSTRAINT "ComplementRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementRequestItem" ADD CONSTRAINT "ComplementRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ComplementRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_complementItemId_fkey" FOREIGN KEY ("complementItemId") REFERENCES "ComplementRequestItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
