-- Journal des imports de barèmes d'encadrement des loyers : un import est vérifié (comptes attendus, liens)
-- avant d'être marqué terminé, pour ne jamais exposer un référentiel importé à moitié.
-- Uniquement un ajout (1 table). Aucune donnée existante n'est modifiée.

-- CreateTable
CREATE TABLE "RentCapImport" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "manifest" JSONB NOT NULL,
    "territories" INTEGER NOT NULL,
    "zones" INTEGER NOT NULL,
    "areas" INTEGER NOT NULL,
    "references" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "RentCapImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentCapImport_startedAt_idx" ON "RentCapImport"("startedAt");
