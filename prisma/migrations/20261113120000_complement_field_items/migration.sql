-- Demandes de complément : l'équipe peut aussi demander des informations (date de naissance,
-- syndic, loyer…), pas seulement des pièces. Uniquement des ajouts : un type, deux motifs, quatre
-- colonnes facultatives ou avec valeur par défaut, et le type de pièce devient facultatif (une ligne
-- « information » n'en a pas). Les lignes existantes deviennent des lignes « pièce » : rien ne change pour elles.

-- CreateEnum
CREATE TYPE "ComplementItemKind" AS ENUM ('DOCUMENT', 'FIELD');

-- AlterEnum
ALTER TYPE "ComplementReason" ADD VALUE IF NOT EXISTS 'WRONG_VALUE';
ALTER TYPE "ComplementReason" ADD VALUE IF NOT EXISTS 'TO_CONFIRM';

-- AlterTable
ALTER TABLE "ComplementRequestItem"
    ADD COLUMN "kind" "ComplementItemKind" NOT NULL DEFAULT 'DOCUMENT',
    ADD COLUMN "fieldKey" TEXT,
    ADD COLUMN "previousValue" JSONB,
    ADD COLUMN "providedValue" JSONB,
    ALTER COLUMN "documentKind" DROP NOT NULL;
