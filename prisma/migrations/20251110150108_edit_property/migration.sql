/*
  Warnings:

  - The `legalStatus` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `paymentDay` on table `Property` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "type" "public"."BienType",
DROP COLUMN "legalStatus",
ADD COLUMN     "legalStatus" "public"."BienLegalStatus",
ALTER COLUMN "paymentDay" SET NOT NULL;
