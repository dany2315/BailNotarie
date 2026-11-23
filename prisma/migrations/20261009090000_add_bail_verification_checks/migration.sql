-- Points de la fiche de vérification validés par l'équipe (ajout seul : aucune donnée existante modifiée).

-- CreateTable
CREATE TABLE "BailVerificationCheck" (
    "id" TEXT NOT NULL,
    "bailId" TEXT NOT NULL,
    "pointKey" TEXT NOT NULL,
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BailVerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BailVerificationCheck_bailId_idx" ON "BailVerificationCheck"("bailId");

-- CreateIndex
CREATE UNIQUE INDEX "BailVerificationCheck_bailId_pointKey_key" ON "BailVerificationCheck"("bailId", "pointKey");

-- AddForeignKey
ALTER TABLE "BailVerificationCheck" ADD CONSTRAINT "BailVerificationCheck_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
