/**
 * Labels centralisés pour les types de documents
 * Utilisé partout dans l'application pour afficher les noms des documents
 */
export const documentKindLabels: Record<string, string> = {
  KBIS: "KBIS",
  STATUTES: "Statuts",
  INSURANCE: "Assurance",
  TITLE_DEED: "Titre de propriété",
  ID_IDENTITY: "Pièce d'identité",
  LIVRET_DE_FAMILLE: "Livret de famille",
  CONTRAT_DE_PACS: "Convention de PACS",
  CONTRAT_DE_MARIAGE: "Contrat de mariage",
  DIAGNOSTICS: "Diagnostics",
  REGLEMENT_COPROPRIETE: "Règlement de copropriété",
  CAHIER_DE_CHARGE_LOTISSEMENT: "Règlement du lotissement",
  STATUT_DE_LASSOCIATION_SYNDICALE: "Statut de l'association syndicale",
  RIB: "RIB",
  PREVIOUS_RENT_PROOF: "Dernier loyer du locataire précédent",
  PREVIOUS_TENANT_EXIT_PROOF: "Départ du locataire précédent",
  WORKS_INVOICES: "Factures des travaux",
  RENT_REFERENCES: "Loyers de logements comparables",
  OCCUPANCY_DECLARATION: "Déclaration d'occupation (impots.gouv)",
  PREVIOUS_LEASE: "Bail précédent",
  LEASE_TERMINATION: "Congé ou fin du bail précédent",
  GENERAL_ASSEMBLY_MINUTES: "Procès-verbaux d'assemblée générale",
  SHOPPING_CENTER_RULES: "Règlement du centre commercial",
  PREMISES_PLANS: "Plans du local",
  OPERAT_CERTIFICATE: "Attestation OPERAT",
  ENVIRONMENTAL_APPENDIX: "Annexe environnementale",
  SIGNING_AUTHORITY: "Autorisation de signer ou délégation de pouvoirs",
  OTHER: "Autre document",
};

/**
 * Obtient le label d'un document par son kind
 * @param kind - Le type de document
 * @returns Le label du document ou le kind si aucun label n'est trouvé
 */
export function getDocumentLabel(kind: string): string {
  return documentKindLabels[kind] || kind;
}



















