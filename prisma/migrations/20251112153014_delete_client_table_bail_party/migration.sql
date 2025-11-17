/*
  Warnings:

  - You are about to drop the `BailParty` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."BailParty" DROP CONSTRAINT "BailParty_bailId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BailParty" DROP CONSTRAINT "BailParty_clientId_fkey";

-- DropTable
DROP TABLE "public"."BailParty";

-- CreateTable
CREATE TABLE "public"."_BailClients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BailClients_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BailClients_B_index" ON "public"."_BailClients"("B");

-- AddForeignKey
ALTER TABLE "public"."_BailClients" ADD CONSTRAINT "_BailClients_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BailClients" ADD CONSTRAINT "_BailClients_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
