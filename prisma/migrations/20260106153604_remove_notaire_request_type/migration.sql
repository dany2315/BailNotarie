/*
  Warnings:

  - You are about to drop the column `type` on the `NotaireRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "NotaireRequest" DROP COLUMN "type";

-- DropEnum
DROP TYPE "NotaireRequestType";
