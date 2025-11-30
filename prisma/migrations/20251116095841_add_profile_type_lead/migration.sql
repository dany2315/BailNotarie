/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `IntakeLink` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."ProfilType" ADD VALUE 'LEAD';

-- AlterTable
ALTER TABLE "public"."IntakeLink" DROP COLUMN "expiresAt";
