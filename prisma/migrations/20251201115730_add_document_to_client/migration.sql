-- AlterTable (safe)
ALTER TABLE "public"."Document"
ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- AddForeignKey (safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Document_clientId_fkey'
  ) THEN
    ALTER TABLE "public"."Document"
    ADD CONSTRAINT "Document_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
