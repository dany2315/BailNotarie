/*
  Warnings:

  - You are about to alter the column `rentAmount` on the `Bail` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.
  - You are about to alter the column `monthlyCharges` on the `Bail` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.
  - You are about to alter the column `securityDeposit` on the `Bail` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "public"."Bail" ALTER COLUMN "rentAmount" SET DATA TYPE INTEGER,
ALTER COLUMN "monthlyCharges" SET DEFAULT 0,
ALTER COLUMN "monthlyCharges" SET DATA TYPE INTEGER,
ALTER COLUMN "securityDeposit" SET DEFAULT 0,
ALTER COLUMN "securityDeposit" SET DATA TYPE INTEGER;
