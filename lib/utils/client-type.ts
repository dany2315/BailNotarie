import { Client, ClientType } from "@prisma/client";

type ClientWithRelations = Client & {
  entreprise?: { id: string } | null;
  persons?: { id: string }[] | null;
};

/**
 * Détermine si un Client est une entreprise ou un particulier
 * Basé sur le champ type du client (PERSONNE_MORALE = entreprise, PERSONNE_PHYSIQUE = particulier)
 * 
 * @param client - Le Client avec son champ type
 * @returns "entreprise" si le client est une personne morale, "particulier" si c'est une personne physique, null sinon
 */
export function getClientType(client: ClientWithRelations): "entreprise" | "particulier" | null {
  // Si le client est une personne morale, c'est une entreprise
  if (client.type === ClientType.PERSONNE_MORALE) {
    return "entreprise";
  }
  
  // Si le client est une personne physique, c'est un particulier
  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    return "particulier";
  }
  
  // Sinon, on ne peut pas déterminer
  return null;
}
