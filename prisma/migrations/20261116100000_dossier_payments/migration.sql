-- Paiements des frais de dossier : suivi de chaque ordre de paiement Stripe, événements Stripe déjà reçus,
-- et liste fermée des anciens dossiers dont le paiement doit être vérifié à la main.
-- Uniquement des ajouts (3 tables, 2 types). Aucune donnée existante n'est modifiée : « paidAt » et
-- « stripePaymentIntentId » des baux restent tels quels.

-- CreateEnum
CREATE TYPE "DossierPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HistoricalPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "DossierPayment" (
    "id" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "status" "DossierPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "intakeLinkId" TEXT,
    "userId" TEXT,
    "bailId" TEXT,
    "stripePaidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "attachedAt" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DossierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "outcome" TEXT,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalPaymentReview" (
    "id" TEXT NOT NULL,
    "bailId" TEXT NOT NULL,
    "status" "HistoricalPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "proofReference" TEXT,
    "note" TEXT,
    "paymentDate" TIMESTAMP(3),

    CONSTRAINT "HistoricalPaymentReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DossierPayment_stripePaymentIntentId_key" ON "DossierPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "DossierPayment_intakeLinkId_idx" ON "DossierPayment"("intakeLinkId");

-- CreateIndex
CREATE INDEX "DossierPayment_bailId_idx" ON "DossierPayment"("bailId");

-- CreateIndex
CREATE INDEX "DossierPayment_userId_idx" ON "DossierPayment"("userId");

-- CreateIndex
CREATE INDEX "DossierPayment_status_idx" ON "DossierPayment"("status");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_paymentIntentId_idx" ON "StripeWebhookEvent"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalPaymentReview_bailId_key" ON "HistoricalPaymentReview"("bailId");

-- CreateIndex
CREATE INDEX "HistoricalPaymentReview_status_idx" ON "HistoricalPaymentReview"("status");

-- AddForeignKey
ALTER TABLE "DossierPayment" ADD CONSTRAINT "DossierPayment_intakeLinkId_fkey" FOREIGN KEY ("intakeLinkId") REFERENCES "IntakeLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierPayment" ADD CONSTRAINT "DossierPayment_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalPaymentReview" ADD CONSTRAINT "HistoricalPaymentReview_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
