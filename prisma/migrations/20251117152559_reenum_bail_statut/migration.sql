/*
  Warnings:

  - The values [ACTIVE,CANCELED,EXPIRED] on the enum `BailStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BailStatus_new" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'READY_FOR_NOTARY', 'SIGNED', 'TERMINATED');
ALTER TABLE "public"."Bail" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Bail" ALTER COLUMN "status" TYPE "public"."BailStatus_new" USING ("status"::text::"public"."BailStatus_new");
ALTER TYPE "public"."BailStatus" RENAME TO "BailStatus_old";
ALTER TYPE "public"."BailStatus_new" RENAME TO "BailStatus";
DROP TYPE "public"."BailStatus_old";
ALTER TABLE "public"."Bail" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;
