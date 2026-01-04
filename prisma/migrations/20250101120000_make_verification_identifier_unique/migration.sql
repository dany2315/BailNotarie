-- DropIndex
DROP INDEX IF EXISTS "Verification_identifier_value_key";

-- Cleanup duplicate identifiers: keep only the most recent one for each identifier
DELETE FROM "public"."Verification" v1
WHERE v1.id NOT IN (
  SELECT DISTINCT ON (v2.identifier) v2.id
  FROM "public"."Verification" v2
  ORDER BY v2.identifier, v2."createdAt" DESC
);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_identifier_key" ON "public"."Verification"("identifier");

