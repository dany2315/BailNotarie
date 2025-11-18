-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'LEAD_CREATED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'LEAD_CONVERTED';

-- CreateTable
CREATE TABLE "public"."CommentRead" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentRead_commentId_idx" ON "public"."CommentRead"("commentId");

-- CreateIndex
CREATE INDEX "CommentRead_userId_idx" ON "public"."CommentRead"("userId");

-- CreateIndex
CREATE INDEX "CommentRead_readAt_idx" ON "public"."CommentRead"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentRead_commentId_userId_key" ON "public"."CommentRead"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "public"."CommentRead" ADD CONSTRAINT "CommentRead_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."CommentInterface"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentRead" ADD CONSTRAINT "CommentRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
