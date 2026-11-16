-- Demandes de complément : la réponse du client reste une proposition jusqu'à l'acceptation par l'équipe
-- (valeurs du dossier au moment de la réponse, puis journal avant/après de ce qui est appliqué).
-- Pièces : une pièce remplacée est archivée (retirée des pièces actives), jamais supprimée, et reliée à
-- la pièce qui la remplace.
-- Uniquement des colonnes facultatives : toutes les pièces existantes restent actives (« archivedAt » vide)
-- et aucune donnée existante n'est modifiée.

-- AlterTable
ALTER TABLE "ComplementRequestItem" ADD COLUMN "appliedAfter" JSONB,
ADD COLUMN "appliedAt" TIMESTAMP(3),
ADD COLUMN "appliedBefore" JSONB,
ADD COLUMN "appliedById" TEXT,
ADD COLUMN "appliedByName" TEXT,
ADD COLUMN "baseValue" JSONB;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "archivedByName" TEXT,
ADD COLUMN "replacedById" TEXT;

-- CreateIndex
CREATE INDEX "Document_archivedAt_idx" ON "Document"("archivedAt");

-- CreateIndex
CREATE INDEX "Document_replacedById_idx" ON "Document"("replacedById");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
