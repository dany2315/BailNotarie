-- AlterTable
ALTER TABLE "public"."Bail" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentIntentId" TEXT;
