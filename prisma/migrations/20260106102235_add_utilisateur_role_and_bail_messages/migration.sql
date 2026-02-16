-- CreateEnum
CREATE TYPE "BailMessageType" AS ENUM ('MESSAGE', 'REQUEST');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'UTILISATEUR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clientId" TEXT;

-- CreateTable
CREATE TABLE "BailMessage" (
    "id" TEXT NOT NULL,
    "bailId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "messageType" "BailMessageType" NOT NULL DEFAULT 'MESSAGE',
    "content" TEXT NOT NULL,
    "notaireRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BailMessage_bailId_idx" ON "BailMessage"("bailId");

-- CreateIndex
CREATE INDEX "BailMessage_senderId_idx" ON "BailMessage"("senderId");

-- CreateIndex
CREATE INDEX "BailMessage_createdAt_idx" ON "BailMessage"("createdAt");

-- CreateIndex
CREATE INDEX "BailMessage_notaireRequestId_idx" ON "BailMessage"("notaireRequestId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BailMessage" ADD CONSTRAINT "BailMessage_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BailMessage" ADD CONSTRAINT "BailMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BailMessage" ADD CONSTRAINT "BailMessage_notaireRequestId_fkey" FOREIGN KEY ("notaireRequestId") REFERENCES "NotaireRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
