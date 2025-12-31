/*
  Warnings:

  - The values [BIRTH_CERT] on the enum `DocumentKind` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
DELETE FROM "public"."Document"
WHERE "kind" = 'BIRTH_CERT';

CREATE TYPE "DocumentKind_new" AS ENUM ('KBIS', 'STATUTES', 'INSURANCE', 'TITLE_DEED', 'ID_IDENTITY', 'LIVRET_DE_FAMILLE', 'CONTRAT_DE_PACS', 'DIAGNOSTICS', 'REGLEMENT_COPROPRIETE', 'CAHIER_DE_CHARGE_LOTISSEMENT', 'STATUT_DE_LASSOCIATION_SYNDICALE', 'RIB');
ALTER TABLE "public"."Document" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "kind" TYPE "DocumentKind_new" USING ("kind"::text::"DocumentKind_new");
ALTER TYPE "DocumentKind" RENAME TO "DocumentKind_old";
ALTER TYPE "DocumentKind_new" RENAME TO "DocumentKind";
DROP TYPE "public"."DocumentKind_old";
ALTER TABLE "Document" ALTER COLUMN "kind" SET DEFAULT 'ID_IDENTITY';
COMMIT;

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "kind" SET DEFAULT 'ID_IDENTITY';
