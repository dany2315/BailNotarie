/*
  Warnings:

  - The `paymentDay` column on the `Bail` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Bail" DROP COLUMN "paymentDay",
ADD COLUMN     "paymentDay" INTEGER;
