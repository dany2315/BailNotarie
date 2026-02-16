-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "city" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "hasRentControl" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inseeCode" TEXT,
ADD COLUMN     "isTightZone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "longitude" DECIMAL(11,8),
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "ZoneTendue" (
    "id" TEXT NOT NULL,
    "inseeCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rentControlEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoneTendue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentControl" (
    "id" TEXT NOT NULL,
    "zoneTendueId" TEXT NOT NULL,
    "propertyType" "BienType" NOT NULL,
    "maxRentPerM2" DECIMAL(10,2) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZoneTendue_inseeCode_key" ON "ZoneTendue"("inseeCode");

-- CreateIndex
CREATE INDEX "ZoneTendue_inseeCode_idx" ON "ZoneTendue"("inseeCode");

-- CreateIndex
CREATE INDEX "ZoneTendue_isActive_idx" ON "ZoneTendue"("isActive");

-- CreateIndex
CREATE INDEX "ZoneTendue_rentControlEnabled_idx" ON "ZoneTendue"("rentControlEnabled");

-- CreateIndex
CREATE INDEX "RentControl_zoneTendueId_idx" ON "RentControl"("zoneTendueId");

-- CreateIndex
CREATE INDEX "RentControl_propertyType_idx" ON "RentControl"("propertyType");

-- CreateIndex
CREATE INDEX "RentControl_effectiveDate_idx" ON "RentControl"("effectiveDate");

-- CreateIndex
CREATE INDEX "Property_inseeCode_idx" ON "Property"("inseeCode");

-- CreateIndex
CREATE INDEX "Property_isTightZone_idx" ON "Property"("isTightZone");

-- AddForeignKey
ALTER TABLE "RentControl" ADD CONSTRAINT "RentControl_zoneTendueId_fkey" FOREIGN KEY ("zoneTendueId") REFERENCES "ZoneTendue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
