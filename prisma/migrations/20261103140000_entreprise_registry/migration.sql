-- Registre des entreprises : société retrouvée par SIREN/SIRET dans les intakes.
-- Ajouts uniquement (colonnes facultatives) : les sociétés existantes restent inchangées (null = non vérifiée).

-- AlterTable
ALTER TABLE "Entreprise" ADD COLUMN "siren" TEXT,
ADD COLUMN "siret" TEXT,
ADD COLUMN "legalFormCode" TEXT,
ADD COLUMN "legalFormLabel" TEXT,
ADD COLUMN "nafCode" TEXT,
ADD COLUMN "registryStatus" TEXT,
ADD COLUMN "registrySource" TEXT,
ADD COLUMN "registryCheckedAt" TIMESTAMP(3),
ADD COLUMN "registryConfirmedByClient" BOOLEAN,
ADD COLUMN "registrySnapshot" JSONB;
