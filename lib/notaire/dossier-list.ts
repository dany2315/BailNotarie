// Liste des dossiers du notaire pour le menu latéral (lecture seule, après contrôle du rôle par le layout).

import { cache } from "react";
import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { DOSSIER_TAB_STATUSES } from "@/lib/utils/bails-labels";

export interface DossierListItem {
  id: string;
  owner: string;
  tenant: string | null;
  address: string;
  status: string;
  /** Date à laquelle le dossier a été confié au notaire (ISO), pour le tri. */
  assignedAt: string | null;
}

const personName = (p: { firstName?: string | null; lastName?: string | null } | undefined) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

function partyName(party: any): string {
  if (!party) return "";
  if (party.entreprise) return party.entreprise.legalName || party.entreprise.name || "Société";
  return (party.persons ?? []).map(personName).filter(Boolean).join(" et ");
}

/**
 * Dossiers du notaire, lus une seule fois par affichage : le menu latéral (layout) et la page les partagent
 * au lieu de refaire la même grosse requête deux fois.
 */
export const notaireDossiers = cache((userId: string) => getDossiersByNotaire(userId));

export async function notaireDossierList(userId: string): Promise<DossierListItem[]> {
  const dossiers = await notaireDossiers(userId);
  return dossiers.map((d: any) => {
    const parties: any[] = d.bail?.parties ?? [];
    return {
      id: d.id,
      owner: partyName(parties.find((p) => p.profilType === "PROPRIETAIRE")) || partyName(d.client) || "Propriétaire",
      tenant: partyName(parties.find((p) => p.profilType === "LOCATAIRE")) || null,
      address: d.bail?.property?.fullAddress || d.property?.fullAddress || "",
      status: d.bail?.status || "READY_FOR_NOTARY",
      assignedAt: d.assignedAt ? new Date(d.assignedAt).toISOString() : null,
    };
  });
}

/** Dossier ouvert par défaut : le premier en cours, sinon le premier. */
export function defaultDossierId(list: DossierListItem[]): string | null {
  return (list.find((d) => DOSSIER_TAB_STATUSES.en_cours.includes(d.status)) ?? list[0])?.id ?? null;
}
