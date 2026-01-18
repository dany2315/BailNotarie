-- Add column if missing
ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "notaireRequestId" TEXT;

-- Add index if missing
CREATE INDEX IF NOT EXISTS "Document_notaireRequestId_idx"
ON "Document"("notaireRequestId");

-- Add foreign key if missing (no native IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND t.relname = 'Document'
      AND a.attname = 'notaireRequestId'
  ) THEN
    ALTER TABLE "Document"
    ADD CONSTRAINT "Document_notaireRequestId_fkey"
    FOREIGN KEY ("notaireRequestId")
    REFERENCES "NotaireRequest"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
