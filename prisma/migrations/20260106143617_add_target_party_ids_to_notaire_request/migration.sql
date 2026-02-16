-- AlterTable
ALTER TABLE "NotaireRequest" ADD COLUMN     "targetPartyIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
