-- Suivi d'envoi et d'ouverture des formulaires (espace administrateur).
-- Migration additive : nouvelles colonnes uniquement, aucune colonne existante
-- n'est modifiée ni supprimée.
ALTER TABLE "IntakeLink" ADD COLUMN "formEmailCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "IntakeLink" ADD COLUMN "lastFormEmailSentAt" TIMESTAMP(3);
ALTER TABLE "IntakeLink" ADD COLUMN "firstOpenedAt" TIMESTAMP(3);
ALTER TABLE "IntakeLink" ADD COLUMN "lastOpenedAt" TIMESTAMP(3);

-- Reprise de l'existant : un formulaire déjà marqué comme envoyé compte un envoi.
-- Ne touche que les nouvelles colonnes.
UPDATE "IntakeLink"
SET "formEmailCount" = 1,
    "lastFormEmailSentAt" = "formEmailSentAt"
WHERE "formEmailSentAt" IS NOT NULL;
