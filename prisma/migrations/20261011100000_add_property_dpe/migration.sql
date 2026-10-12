-- DPE saisi par l'équipe sur le bien (ajout seul : aucune donnée existante modifiée).

-- CreateEnum
CREATE TYPE "EnergyClass" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "dpeClass" "EnergyClass",
ADD COLUMN "gesClass" "EnergyClass",
ADD COLUMN "dpeDate" TIMESTAMP(3);
