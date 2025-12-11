/**
 * Labels centralisés pour les types de documents
 * Utilisé partout dans l'application pour afficher les noms des documents
 */
export const documentKindLabels: Record<string, string> = {
  KBIS: "KBIS",
  STATUTES: "Statuts",
  INSURANCE: "Assurance",
  TITLE_DEED: "Titre de propriété",
  BIRTH_CERT: "Acte de naissance",
  ID_IDENTITY: "Pièce d'identité",
  LIVRET_DE_FAMILLE: "Livret de famille",
  CONTRAT_DE_PACS: "Contrat de PACS",
  DIAGNOSTICS: "Diagnostics",
  REGLEMENT_COPROPRIETE: "Règlement de copropriété",
  CAHIER_DE_CHARGE_LOTISSEMENT: "Cahier des charges lotissement",
  STATUT_DE_LASSOCIATION_SYNDICALE: "Statut de l'association syndicale",
  RIB: "RIB",
};

/**
 * Obtient le label d'un document par son kind
 * @param kind - Le type de document
 * @returns Le label du document ou le kind si aucun label n'est trouvé
 */
export function getDocumentLabel(kind: string): string {
  return documentKindLabels[kind] || kind;
}





