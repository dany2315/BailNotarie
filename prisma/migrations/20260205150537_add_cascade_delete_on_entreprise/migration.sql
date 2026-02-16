-- DropForeignKey
ALTER TABLE "Entreprise" DROP CONSTRAINT "Entreprise_clientId_fkey";

-- AddForeignKey
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
