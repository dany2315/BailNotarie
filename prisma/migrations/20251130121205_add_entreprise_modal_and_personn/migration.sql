/*
  Warnings:

  - You are about to drop the column `birthDate` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `birthPlace` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `familyStatus` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `fullAddress` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `legalName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `matrimonialRegime` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `nationality` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `profession` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `registration` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Document` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_clientId_fkey";

-- DropIndex
DROP INDEX "public"."Client_email_idx";

-- DropIndex
DROP INDEX "public"."Client_email_key";

-- DropIndex
DROP INDEX "public"."Document_clientId_idx";

-- AlterTable
ALTER TABLE "public"."Client" DROP COLUMN "birthDate",
DROP COLUMN "birthPlace",
DROP COLUMN "email",
DROP COLUMN "familyStatus",
DROP COLUMN "firstName",
DROP COLUMN "fullAddress",
DROP COLUMN "lastName",
DROP COLUMN "legalName",
DROP COLUMN "matrimonialRegime",
DROP COLUMN "nationality",
DROP COLUMN "phone",
DROP COLUMN "profession",
DROP COLUMN "registration";

-- AlterTable
ALTER TABLE "public"."Document" DROP COLUMN "clientId",
ADD COLUMN     "entrepriseId" TEXT,
ADD COLUMN     "personId" TEXT;

-- CreateTable
CREATE TABLE "public"."Person" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "profession" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "fullAddress" TEXT,
    "nationality" TEXT,
    "familyStatus" "public"."FamilyStatus",
    "matrimonialRegime" "public"."MatrimonialRegime",
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Entreprise" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "fullAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Person_clientId_idx" ON "public"."Person"("clientId");

-- CreateIndex
CREATE INDEX "Person_email_idx" ON "public"."Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_clientId_key" ON "public"."Entreprise"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_email_key" ON "public"."Entreprise"("email");

-- CreateIndex
CREATE INDEX "Entreprise_clientId_idx" ON "public"."Entreprise"("clientId");

-- CreateIndex
CREATE INDEX "Entreprise_email_idx" ON "public"."Entreprise"("email");

-- CreateIndex
CREATE INDEX "Document_personId_idx" ON "public"."Document"("personId");

-- CreateIndex
CREATE INDEX "Document_entrepriseId_idx" ON "public"."Document"("entrepriseId");

-- AddForeignKey
ALTER TABLE "public"."Person" ADD CONSTRAINT "Person_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Person" ADD CONSTRAINT "Person_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Person" ADD CONSTRAINT "Person_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Entreprise" ADD CONSTRAINT "Entreprise_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Entreprise" ADD CONSTRAINT "Entreprise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Entreprise" ADD CONSTRAINT "Entreprise_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "public"."Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
