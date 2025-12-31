-- CreateEnum
CREATE TYPE "NotaireRequestType" AS ENUM ('DOCUMENT', 'DATA');

-- CreateEnum
CREATE TYPE "NotaireRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "NotaireRequest" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" "NotaireRequestType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetProprietaire" BOOLEAN NOT NULL DEFAULT false,
    "targetLocataire" BOOLEAN NOT NULL DEFAULT false,
    "status" "NotaireRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "NotaireRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotaireRequest_dossierId_idx" ON "NotaireRequest"("dossierId");

-- CreateIndex
CREATE INDEX "NotaireRequest_status_idx" ON "NotaireRequest"("status");

-- CreateIndex
CREATE INDEX "NotaireRequest_createdById_idx" ON "NotaireRequest"("createdById");

-- AddForeignKey
ALTER TABLE "NotaireRequest" ADD CONSTRAINT "NotaireRequest_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "DossierNotaireAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaireRequest" ADD CONSTRAINT "NotaireRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
