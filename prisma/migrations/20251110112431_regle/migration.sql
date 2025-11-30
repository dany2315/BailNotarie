/*
  Warnings:

  - You are about to drop the column `locataireId` on the `Bail` table. All the data in the column will be lost.
  - You are about to drop the column `proprietaireId` on the `Bail` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Bail" DROP CONSTRAINT "Bail_locataireId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bail" DROP CONSTRAINT "Bail_proprietaireId_fkey";

-- DropIndex
DROP INDEX "public"."Bail_locataireId_idx";

-- DropIndex
DROP INDEX "public"."Bail_proprietaireId_idx";

-- AlterTable
ALTER TABLE "public"."Bail" DROP COLUMN "locataireId",
DROP COLUMN "proprietaireId";

-- CreateTable
CREATE TABLE "public"."_BailParties" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BailParties_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BailParties_B_index" ON "public"."_BailParties"("B");

-- AddForeignKey
ALTER TABLE "public"."_BailParties" ADD CONSTRAINT "_BailParties_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BailParties" ADD CONSTRAINT "_BailParties_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
