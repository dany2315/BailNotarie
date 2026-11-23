-- Bail commercial : centre commercial ou autre ensemble immobilier (parc d'activités, ASL…).
-- Colonne facultative : les biens existants restent inchangés (null = non précisé).

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "complexType" TEXT;
