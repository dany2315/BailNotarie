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

-- DropForeignKey (on enlève la contrainte, mais on garde la colonne clientId pour backfill)
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_clientId_fkey";

-- DropIndex (pas bloquant pour le backfill)
DROP INDEX "public"."Client_email_idx";
DROP INDEX "public"."Client_email_key";
DROP INDEX "public"."Document_clientId_idx";

-- 1) CreateTable Person
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

-- 2) CreateTable Entreprise
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

-- 3) Add new columns on Document (on ne drop PAS clientId tout de suite)
ALTER TABLE "public"."Document"
ADD COLUMN "entrepriseId" TEXT,
ADD COLUMN "personId" TEXT;

-- 4) Indexes
CREATE INDEX "Person_clientId_idx" ON "public"."Person"("clientId");
CREATE INDEX "Person_email_idx" ON "public"."Person"("email");

CREATE UNIQUE INDEX "Entreprise_clientId_key" ON "public"."Entreprise"("clientId");
CREATE UNIQUE INDEX "Entreprise_email_key" ON "public"."Entreprise"("email");
CREATE INDEX "Entreprise_clientId_idx" ON "public"."Entreprise"("clientId");
CREATE INDEX "Entreprise_email_idx" ON "public"."Entreprise"("email");

CREATE INDEX "Document_personId_idx" ON "public"."Document"("personId");
CREATE INDEX "Document_entrepriseId_idx" ON "public"."Document"("entrepriseId");

-- =========================
-- BACKFILL DATA
-- =========================

-- 5) Backfill Person depuis Client (PERSONNE_PHYSIQUE)
-- Astuce: on réutilise Client.id comme Person.id (simple et stable)
INSERT INTO "public"."Person" (
  "id","clientId","firstName","lastName","profession","phone","email","fullAddress","nationality",
  "familyStatus","matrimonialRegime","birthPlace","birthDate","isPrimary","createdAt","updatedAt","createdById","updatedById"
)
SELECT
  c."id" AS "id",
  c."id" AS "clientId",
  c."firstName",
  c."lastName",
  c."profession",
  c."phone",
  c."email",
  c."fullAddress",
  c."nationality",
  c."familyStatus",
  c."matrimonialRegime",
  c."birthPlace",
  c."birthDate",
  TRUE AS "isPrimary",
  c."createdAt",
  c."updatedAt",
  c."createdById",
  c."updatedById"
FROM "public"."Client" c
WHERE c."type" = 'PERSONNE_PHYSIQUE';

-- 6) Backfill Entreprise depuis Client (PERSONNE_MORALE)
-- attention: colonnes NOT NULL -> fallback unique si manquant
INSERT INTO "public"."Entreprise" (
  "id","clientId","registration","legalName","name","email","phone","fullAddress","createdAt","updatedAt","createdById","updatedById"
)
SELECT
  c."id" AS "id",
  c."id" AS "clientId",
  COALESCE(c."registration", c."id") AS "registration",
  COALESCE(c."legalName", ('Entreprise ' || c."id")) AS "legalName",
  COALESCE(c."legalName", ('Entreprise ' || c."id")) AS "name",
  COALESCE(c."email", ('no-email+' || c."id" || '@bailnotarie.local')) AS "email",
  c."phone",
  c."fullAddress",
  c."createdAt",
  c."updatedAt",
  c."createdById",
  c."updatedById"
FROM "public"."Client" c
WHERE c."type" = 'PERSONNE_MORALE';

-- 7) Rebrancher les Documents vers personId / entrepriseId avant de drop clientId
-- Docs -> Person (uniquement si client PERSONNE_PHYSIQUE et PAS livret)
UPDATE "public"."Document" d
SET "personId" = d."clientId"
FROM "public"."Client" c
WHERE d."clientId" IS NOT NULL
  AND c."id" = d."clientId"
  AND c."type" = 'PERSONNE_PHYSIQUE'
  AND d."kind" <> 'LIVRET_DE_FAMILLE';

-- Docs -> Entreprise (uniquement si client PERSONNE_MORALE et PAS livret)
UPDATE "public"."Document" d
SET "entrepriseId" = d."clientId"
FROM "public"."Client" c
WHERE d."clientId" IS NOT NULL
  AND c."id" = d."clientId"
  AND c."type" = 'PERSONNE_MORALE'
  AND d."kind" <> 'LIVRET_DE_FAMILLE';


-- =========================
-- CLEANUP STRUCTURE
-- =========================

-- 8) Maintenant seulement: drop colonnes de Client
ALTER TABLE "public"."Client"
  DROP COLUMN "birthDate",
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


-- 10) FKs
ALTER TABLE "public"."Person"
  ADD CONSTRAINT "Person_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Person"
  ADD CONSTRAINT "Person_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Person"
  ADD CONSTRAINT "Person_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Entreprise"
  ADD CONSTRAINT "Entreprise_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."Entreprise"
  ADD CONSTRAINT "Entreprise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Entreprise"
  ADD CONSTRAINT "Entreprise_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Document"
  ADD CONSTRAINT "Document_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Document"
  ADD CONSTRAINT "Document_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "public"."Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
