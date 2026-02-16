-- AlterTable
ALTER TABLE "BailMessage" ADD COLUMN     "recipientPartyId" TEXT;

-- CreateIndex
CREATE INDEX "BailMessage_recipientPartyId_idx" ON "BailMessage"("recipientPartyId");

-- AddForeignKey
ALTER TABLE "BailMessage" ADD CONSTRAINT "BailMessage_recipientPartyId_fkey" FOREIGN KEY ("recipientPartyId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
