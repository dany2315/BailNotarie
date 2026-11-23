-- Pièces du bail d'habitation alignées sur la liste du notaire. Ajouts uniquement :
-- les pièces et les dossiers existants restent inchangés (null = non renseigné).

-- AlterEnum (PostgreSQL 12 et plus : plusieurs valeurs dans une même migration)
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'CONTRAT_DE_MARIAGE';
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'OCCUPANCY_DECLARATION';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "syndicName" TEXT,
ADD COLUMN "syndicEmail" TEXT,
ADD COLUMN "syndicPhone" TEXT,
ADD COLUMN "subdivisionOver10Years" TEXT;

-- AlterTable
ALTER TABLE "Bail" ADD COLUMN "tenantConfirmedTermsAt" TIMESTAMP(3);
