/*
  Warnings:

  - The values [azert] on the enum `ProfilType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProfilType_new" AS ENUM ('PROPRIETAIRE', 'LOCATAIRE', 'LEAD');
ALTER TABLE "Client" ALTER COLUMN "profilType" TYPE "ProfilType_new" USING ("profilType"::text::"ProfilType_new");
ALTER TYPE "ProfilType" RENAME TO "ProfilType_old";
ALTER TYPE "ProfilType_new" RENAME TO "ProfilType";
DROP TYPE "public"."ProfilType_old";
COMMIT;
