-- Encadrement des loyers : données des arrêtés et catégorie des logements (ajout seul : aucune donnée existante modifiée).

-- AlterTable
ALTER TABLE "Bail" ADD COLUMN     "rentSupplementAt" TIMESTAMP(3),
ADD COLUMN     "rentSupplementByName" TEXT,
ADD COLUMN     "rentSupplementReason" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "constructionPeriod" TEXT,
ADD COLUMN     "mainRooms" INTEGER,
ADD COLUMN     "rentCapZone" TEXT;

-- CreateTable
CREATE TABLE "RentCapTerritory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "inseeCodes" TEXT[],
    "zoneMode" TEXT NOT NULL,
    "periods" TEXT[],
    "houseTypes" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "geometrySource" TEXT,
    "simulatorUrl" TEXT,
    "mapUrl" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentCapTerritory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentCapZone" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "RentCapZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentCapArea" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "bbox" DOUBLE PRECISION[],

    CONSTRAINT "RentCapArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentCapReference" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "houseType" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "furnished" BOOLEAN NOT NULL,
    "refMin" DECIMAL(6,2) NOT NULL,
    "ref" DECIMAL(6,2) NOT NULL,
    "refMax" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "RentCapReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentCapZone_territoryId_code_key" ON "RentCapZone"("territoryId", "code");

-- CreateIndex
CREATE INDEX "RentCapArea_territoryId_idx" ON "RentCapArea"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RentCapReference_territoryId_zoneCode_houseType_rooms_perio_key" ON "RentCapReference"("territoryId", "zoneCode", "houseType", "rooms", "period", "furnished");

-- AddForeignKey
ALTER TABLE "RentCapZone" ADD CONSTRAINT "RentCapZone_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "RentCapTerritory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentCapArea" ADD CONSTRAINT "RentCapArea_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "RentCapTerritory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentCapReference" ADD CONSTRAINT "RentCapReference_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "RentCapTerritory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

