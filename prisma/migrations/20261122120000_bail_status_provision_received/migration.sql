-- Nouvelle étape du dossier chez le notaire : « Provision reçue » (le client a versé la provision sur frais,
-- le notaire peut commencer la rédaction). Placée entre « Client contacté » et « Signé ».
-- Additive : seule une valeur est ajoutée à la liste ; aucun dossier existant ne change de statut.
-- Retour arrière : PostgreSQL ne retire pas une valeur d'un type énuméré ; l'ancien code ignore simplement cette
-- valeur tant qu'aucun dossier ne l'utilise.

-- AlterEnum
ALTER TYPE "BailStatus" ADD VALUE IF NOT EXISTS 'PROVISION_RECEIVED' AFTER 'CLIENT_CONTACTED';
