-- AlterEnum
ALTER TYPE "DocumentKind" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "BailMessage" ADD COLUMN     "documentId" TEXT;

-- CreateIndex
CREATE INDEX "BailMessage_documentId_idx" ON "BailMessage"("documentId");

-- AddForeignKey
ALTER TABLE "BailMessage" ADD CONSTRAINT "BailMessage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
