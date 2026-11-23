import type { DossiersVariant } from "@/components/client-v2/dossiers";

/**
 * La mise en page de « Mes dossiers ».
 *
 * Quatre compositions coexistent dans `components/client-v2/dossiers` et
 * partagent le même contrôleur — donc la même logique, les mêmes actions et
 * les mêmes règles métier. Seule change la façon de les agencer :
 *
 * • "fiches"   — une carte par bien, ses baux en lignes à l'intérieur (en service)
 * • "registre" — l'intertitre du bien posé sur la page, ses baux dans une carte
 * • "etapes"   — les dossiers regroupés par avancement
 * • "liste"    — aucun carton, intertitres collants au défilement
 *
 * Changer cette seule valeur bascule la page.
 */
export const OWNER_DOSSIERS_VIEW: DossiersVariant = "fiches";
