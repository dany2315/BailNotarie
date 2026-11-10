-- Diagnostics : décisions de l'équipe par diagnostic (conforme, non concerné, date saisie),
-- lecture d'un seul nouveau fichier, et notification « diagnostics à régler ».
-- Uniquement des ajouts : aucune donnée existante n'est modifiée.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DIAGNOSTICS_TO_REVIEW';

-- CreateEnum
CREATE TYPE "DiagnosticDecisionKind" AS ENUM ('CONFORME', 'NON_CONCERNE', 'DATE');

-- AlterTable
ALTER TABLE "DiagnosticAnalysis" ADD COLUMN "item" TEXT;

-- CreateTable
CREATE TABLE "DiagnosticDecision" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "kind" "DiagnosticDecisionKind" NOT NULL,
    "note" TEXT,
    "basis" TEXT,
    "date" TIMESTAMP(3),
    "documentId" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedByName" TEXT,

    CONSTRAINT "DiagnosticDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosticDecision_propertyId_item_idx" ON "DiagnosticDecision"("propertyId", "item");

-- AddForeignKey
ALTER TABLE "DiagnosticDecision" ADD CONSTRAINT "DiagnosticDecision_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
