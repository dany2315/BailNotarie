-- Accord du locataire : quand les conditions du bail changent ou que le locataire est remplacé, l'accord
-- en cours n'est plus valable. Il est conservé dans un historique et une nouvelle confirmation est demandée.
-- Uniquement des ajouts (1 table, 1 type, 3 colonnes facultatives sur « Bail »). Aucune donnée existante
-- n'est modifiée : les accords déjà enregistrés (« tenantConfirmedTermsAt ») restent valables tels quels.

-- CreateEnum
CREATE TYPE "TenantAgreementEndReason" AS ENUM ('TERMS_CHANGED', 'TENANT_REPLACED');

-- AlterTable
ALTER TABLE "Bail" ADD COLUMN "tenantConfirmedById" TEXT,
ADD COLUMN "tenantConfirmedTerms" JSONB,
ADD COLUMN "tenantReconfirmationRequestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BailTenantAgreementHistory" (
    "id" TEXT NOT NULL,
    "bailId" TEXT NOT NULL,
    "tenantId" TEXT,
    "tenantName" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "confirmedTerms" JSONB,
    "termsBeforeChange" JSONB NOT NULL,
    "changes" JSONB,
    "reason" "TenantAgreementEndReason" NOT NULL,
    "invalidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedById" TEXT,
    "invalidatedByName" TEXT NOT NULL,

    CONSTRAINT "BailTenantAgreementHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BailTenantAgreementHistory_bailId_invalidatedAt_idx" ON "BailTenantAgreementHistory"("bailId", "invalidatedAt");

-- AddForeignKey
ALTER TABLE "BailTenantAgreementHistory" ADD CONSTRAINT "BailTenantAgreementHistory_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
