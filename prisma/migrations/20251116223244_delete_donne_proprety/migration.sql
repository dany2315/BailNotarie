/*
  Warnings:

  - You are about to drop the column `baseRentAmount` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyCharges` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDay` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `securityDeposit` on the `Property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Property" DROP COLUMN "baseRentAmount",
DROP COLUMN "monthlyCharges",
DROP COLUMN "paymentDay",
DROP COLUMN "securityDeposit";
