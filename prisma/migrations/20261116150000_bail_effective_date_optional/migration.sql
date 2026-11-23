-- Date de prise d'effet du bail : facultative tant que le locataire n'est pas connu (elle est demandée avec
-- le jour de paiement, après la partie locataire).
-- La colonne accepte désormais une valeur vide. Aucune date déjà enregistrée n'est modifiée ni effacée.
-- Retour arrière : le code précédent suppose une date toujours présente ; avant d'y revenir, renseigner les
-- baux créés sans date depuis la bascule.

-- AlterTable
ALTER TABLE "Bail" ALTER COLUMN "effectiveDate" DROP NOT NULL;
