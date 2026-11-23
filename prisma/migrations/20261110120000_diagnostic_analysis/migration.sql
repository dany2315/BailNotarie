-- Analyse automatique des diagnostics d'un bien (lecture par IA, demandée par l'équipe).
-- Additive : nouvelle table, aucune donnée existante modifiée.

-- CreateTable
CREATE TABLE "DiagnosticAnalysis" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "bailId" TEXT,
    "documentIds" TEXT[],
    "status" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "extracted" JSONB,
    "error" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "durationMs" INTEGER,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DiagnosticAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosticAnalysis_propertyId_createdAt_idx" ON "DiagnosticAnalysis"("propertyId", "createdAt");

-- AddForeignKey
ALTER TABLE "DiagnosticAnalysis" ADD CONSTRAINT "DiagnosticAnalysis_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
