-- CreateEnum
CREATE TYPE "public"."CompletionStatus" AS ENUM ('NOT_STARTED', 'PARTIAL', 'PENDING_CHECK', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "completionStatus" "public"."CompletionStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "completionStatus" "public"."CompletionStatus" NOT NULL DEFAULT 'NOT_STARTED';
