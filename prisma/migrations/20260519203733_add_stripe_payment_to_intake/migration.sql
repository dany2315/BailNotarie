-- AlterTable
ALTER TABLE "public"."IntakeLink" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentIntentId" TEXT;
