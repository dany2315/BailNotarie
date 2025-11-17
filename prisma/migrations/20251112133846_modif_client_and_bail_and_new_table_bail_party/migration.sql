/*
  Warnings:

  - You are about to drop the `_BailParties` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_BailParties" DROP CONSTRAINT "_BailParties_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_BailParties" DROP CONSTRAINT "_BailParties_B_fkey";

-- DropTable
DROP TABLE "public"."_BailParties";

-- CreateTable
CREATE TABLE "public"."BailParty" (
    "bailId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" "public"."ProfilType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "share" DECIMAL(5,2),
    "signedAt" TIMESTAMP(3),
    "signatureId" TEXT,
    "notes" TEXT,

    CONSTRAINT "BailParty_pkey" PRIMARY KEY ("bailId","clientId","role")
);

-- CreateIndex
CREATE INDEX "BailParty_clientId_role_idx" ON "public"."BailParty"("clientId", "role");

-- CreateIndex
CREATE INDEX "BailParty_bailId_role_idx" ON "public"."BailParty"("bailId", "role");

-- AddForeignKey
ALTER TABLE "public"."BailParty" ADD CONSTRAINT "BailParty_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "public"."Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BailParty" ADD CONSTRAINT "BailParty_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
