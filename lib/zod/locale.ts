import { z } from "zod";

/**
 * Messages de validation de Zod en français, partout (navigateur et serveur) : filet de sécurité pour les
 * champs sans message propre (m15). Chargé par lib/utils.ts, importé par tous les écrans, et par les schémas.
 */
z.config(z.locales.fr());
