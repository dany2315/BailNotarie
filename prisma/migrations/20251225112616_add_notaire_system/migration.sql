-- CreateTable
CREATE TABLE "DossierNotaireAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT,
    "bailId" TEXT,
    "notaireId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DossierNotaireAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTPCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTPCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DossierNotaireAssignment_notaireId_idx" ON "DossierNotaireAssignment"("notaireId");

-- CreateIndex
CREATE INDEX "DossierNotaireAssignment_clientId_idx" ON "DossierNotaireAssignment"("clientId");

-- CreateIndex
CREATE INDEX "DossierNotaireAssignment_bailId_idx" ON "DossierNotaireAssignment"("bailId");

-- CreateIndex
CREATE UNIQUE INDEX "DossierNotaireAssignment_clientId_propertyId_bailId_notaire_key" ON "DossierNotaireAssignment"("clientId", "propertyId", "bailId", "notaireId");

-- CreateIndex
CREATE INDEX "OTPCode_email_used_idx" ON "OTPCode"("email", "used");

-- CreateIndex
CREATE INDEX "OTPCode_expiresAt_idx" ON "OTPCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "DossierNotaireAssignment" ADD CONSTRAINT "DossierNotaireAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierNotaireAssignment" ADD CONSTRAINT "DossierNotaireAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierNotaireAssignment" ADD CONSTRAINT "DossierNotaireAssignment_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierNotaireAssignment" ADD CONSTRAINT "DossierNotaireAssignment_notaireId_fkey" FOREIGN KEY ("notaireId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierNotaireAssignment" ADD CONSTRAINT "DossierNotaireAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
