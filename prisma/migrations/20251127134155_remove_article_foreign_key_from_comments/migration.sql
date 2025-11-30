ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_articleId_fkey";
CREATE INDEX IF NOT EXISTS "comments_articleId_idx" ON "comments"("articleId");
