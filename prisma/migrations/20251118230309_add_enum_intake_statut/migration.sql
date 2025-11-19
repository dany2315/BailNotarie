/*
  Warnings:

  - The `status` column on the `IntakeLink` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."IntakeStatus" AS ENUM ('PENDING', 'SUBMITTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "public"."IntakeLink" DROP COLUMN "status",
ADD COLUMN     "status" "public"."IntakeStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "IntakeLink_status_idx" ON "public"."IntakeLink"("status");
