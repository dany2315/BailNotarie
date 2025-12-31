-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "hasCongelateur" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasEtageresRangement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasFour" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasLiterie" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasLuminaires" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasMaterielEntretien" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPlaquesCuisson" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasRefrigerateur" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasRideaux" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSieges" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasUstensilesCuisine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasVaisselle" BOOLEAN NOT NULL DEFAULT false;
