/*
  Warnings:

  - The values [CHAMBRE,LOCAL_COMMERCIAL,LOCAL_PROFESSIONNEL,LOCAL_SAISONNIER] on the enum `BienType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BienType_new" AS ENUM ('APPARTEMENT', 'MAISON');
ALTER TABLE "public"."Property" ALTER COLUMN "type" TYPE "public"."BienType_new" USING ("type"::text::"public"."BienType_new");
ALTER TYPE "public"."BienType" RENAME TO "BienType_old";
ALTER TYPE "public"."BienType_new" RENAME TO "BienType";
DROP TYPE "public"."BienType_old";
COMMIT;
