-- Demandes de complément envoyées par le notaire : même table que celles de l'équipe, avec leur origine.
-- Uniquement des ajouts : un type, une colonne avec valeur par défaut (« équipe » pour toutes les demandes
-- existantes) et une valeur de notification. Aucune donnée existante n'est modifiée.

-- CreateEnum
CREATE TYPE "ComplementOrigin" AS ENUM ('TEAM', 'NOTAIRE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMPLEMENT_REQUESTED_BY_NOTAIRE';

-- AlterTable
ALTER TABLE "ComplementRequest" ADD COLUMN "origin" "ComplementOrigin" NOT NULL DEFAULT 'TEAM';
