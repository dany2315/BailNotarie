-- Suite de la migration précédente (propositions de complément et archivage des pièces).
-- Uniquement des colonnes facultatives : aucune donnée existante n'est modifiée.
--  - ComplementRequestItem.proposedAnswer : réponse du client, appliquée au dossier seulement à l'acceptation.
--  - Document.archivedFrom / archivedBailId : ancien rattachement d'une pièce archivée (elle est détachée de
--    sa fiche à l'archivage) et dossier depuis lequel elle a été archivée.

-- AlterTable
ALTER TABLE "ComplementRequestItem" ADD COLUMN "proposedAnswer" JSONB;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "archivedBailId" TEXT,
ADD COLUMN "archivedFrom" JSONB;

-- CreateIndex
CREATE INDEX "Document_archivedBailId_idx" ON "Document"("archivedBailId");
