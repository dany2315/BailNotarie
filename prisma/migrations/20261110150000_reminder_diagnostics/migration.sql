-- Relance « Diagnostics » : ce qui bloque la location, ou questions au propriétaire.
-- Additive : nouvelle valeur d'enum, aucune donnée existante modifiée.
ALTER TYPE "ReminderReason" ADD VALUE IF NOT EXISTS 'DIAGNOSTICS';
