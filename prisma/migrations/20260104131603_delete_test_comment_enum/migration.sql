/*
  Warnings:

  - The values [COMMENT] on the enum `CommentTarget` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CommentTarget_new" AS ENUM ('CLIENT', 'PROPERTY', 'BAIL', 'DOCUMENT', 'INTAKE', 'LEAD');
ALTER TABLE "CommentInterface" ALTER COLUMN "target" TYPE "CommentTarget_new" USING ("target"::text::"CommentTarget_new");
ALTER TYPE "CommentTarget" RENAME TO "CommentTarget_old";
ALTER TYPE "CommentTarget_new" RENAME TO "CommentTarget";
DROP TYPE "public"."CommentTarget_old";
COMMIT;
