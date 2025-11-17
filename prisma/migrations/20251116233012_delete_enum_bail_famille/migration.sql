/*
  Warnings:

  - The values [MEUBLE,COMMERCIAL,PROFESSIONNEL,SAISONNIER,OTHER] on the enum `BailFamille` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BailFamille_new" AS ENUM ('HABITATION');
ALTER TABLE "public"."Bail" ALTER COLUMN "bailFamily" TYPE "public"."BailFamille_new" USING ("bailFamily"::text::"public"."BailFamille_new");
ALTER TYPE "public"."BailFamille" RENAME TO "BailFamille_old";
ALTER TYPE "public"."BailFamille_new" RENAME TO "BailFamille";
DROP TYPE "public"."BailFamille_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Bail" ALTER COLUMN "bailFamily" SET DEFAULT 'HABITATION';
