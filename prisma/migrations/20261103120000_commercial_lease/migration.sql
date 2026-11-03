-- Bail commercial : types de bail et de local, pièces, conditions commerciales.
-- Ajouts uniquement : les baux, biens et sociétés existants restent inchangés (null = non renseigné).

-- AlterEnum (PostgreSQL 12 et plus : plusieurs valeurs dans une même migration)
ALTER TYPE "BienType" ADD VALUE IF NOT EXISTS 'BOUTIQUE';
ALTER TYPE "BienType" ADD VALUE IF NOT EXISTS 'BUREAU';
ALTER TYPE "BienType" ADD VALUE IF NOT EXISTS 'LOCAL_ACTIVITE';
ALTER TYPE "BienType" ADD VALUE IF NOT EXISTS 'ENTREPOT';
ALTER TYPE "BienType" ADD VALUE IF NOT EXISTS 'AUTRE_LOCAL';

ALTER TYPE "BailType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_3_6_9';
ALTER TYPE "BailType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_DEROGATOIRE';

ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'PREVIOUS_LEASE';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'LEASE_TERMINATION';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'GENERAL_ASSEMBLY_MINUTES';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'SHOPPING_CENTER_RULES';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'PREMISES_PLANS';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'OPERAT_CERTIFICATE';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'ENVIRONMENTAL_APPENDIX';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'SIGNING_AUTHORITY';

-- AlterTable
ALTER TABLE "Entreprise" ADD COLUMN "representativeName" TEXT,
ADD COLUMN "representativeRole" TEXT,
ADD COLUMN "isRegistered" BOOLEAN;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "inShoppingCenter" BOOLEAN,
ADD COLUMN "outbuildings" TEXT;

-- CreateTable
CREATE TABLE "BailCommercialTerms" (
    "id" TEXT NOT NULL,
    "bailId" TEXT NOT NULL,
    "activity" TEXT,
    "ancillaryActivities" TEXT,
    "previouslyLet" BOOLEAN,
    "previousActivity" TEXT,
    "currentlyVacant" BOOLEAN,
    "derogatoryMonths" INTEGER,
    "keysHandoverDate" TIMESTAMP(3),
    "rentFreeMonths" INTEGER,
    "rentPeriodicity" TEXT,
    "vatApplicable" BOOLEAN,
    "indexation" TEXT,
    "entryFee" INTEGER,
    "feesPaidBy" TEXT,
    "chargesAllocation" JSONB,
    "hasPastWorks" BOOLEAN,
    "pastWorks" JSONB,
    "hasPlannedWorks" BOOLEAN,
    "plannedWorks" JSONB,
    "hasGuarantor" BOOLEAN,
    "guarantorName" TEXT,
    "guarantorEmail" TEXT,
    "clauses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clausesNote" TEXT,
    "premisesBoughtDuringMarriage" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BailCommercialTerms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BailCommercialTerms_bailId_key" ON "BailCommercialTerms"("bailId");

-- AddForeignKey
ALTER TABLE "BailCommercialTerms" ADD CONSTRAINT "BailCommercialTerms_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
