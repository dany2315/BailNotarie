-- Encadrement des loyers : communes partiellement encadrées, zones par commune et logements exclus
-- (ajout seul : colonnes facultatives, aucune donnée existante modifiée).

-- AlterTable
ALTER TABLE "Bail" ADD COLUMN     "rentCapExemption" TEXT,
ADD COLUMN     "rentCapExemptionAt" TIMESTAMP(3),
ADD COLUMN     "rentCapExemptionByName" TEXT,
ADD COLUMN     "rentCapExemptionNote" TEXT;

-- AlterTable
ALTER TABLE "RentCapTerritory" ADD COLUMN     "communeZones" JSONB,
ADD COLUMN     "partialInseeCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "precisionM" INTEGER;
