import * as React from "react";
import { EmailLayout, Title, Lead, KeyValues, Quote, Actions, Sign } from "./_shared/layout";

interface MailNotaireAssignmentProps {
  userName?: string | null;
  clientName: string;
  /** Adresse du bien (avec la surface si elle est connue). */
  propertyAddress?: string;
  /** « Location vide, 3 ans »… */
  bailTypeLabel?: string | null;
  ownerName?: string | null;
  /** Vide si aucun locataire n'est encore sur le dossier. */
  tenantName?: string | null;
  /** « 1 100 € + 95 € de charges ». */
  rentText?: string | null;
  /** Le bien et chaque partie ont été validés par l'équipe. */
  documentsVerified?: boolean;
  /** « 1er décembre 2026 ». */
  effectiveDate?: string | null;
  notes?: string | null;
  interfaceUrl: string;
}

/** Un dossier est confié au notaire. */
export default function MailNotaireAssignment({
  clientName,
  propertyAddress,
  bailTypeLabel,
  ownerName,
  tenantName,
  rentText,
  documentsVerified,
  effectiveDate,
  notes,
  interfaceUrl,
}: MailNotaireAssignmentProps) {
  const owner = (ownerName || clientName || "").trim();
  const rows: Array<[string, React.ReactNode]> = [];
  if (bailTypeLabel) rows.push(["Type", bailTypeLabel]);
  if (propertyAddress) rows.push(["Bien", propertyAddress]);
  rows.push(["Bailleur", owner]);
  rows.push(["Locataire", tenantName || "Pas encore indiqué"]);
  if (rentText) rows.push(["Loyer", rentText]);
  if (documentsVerified !== undefined) {
    rows.push([
      "Pièces",
      <span key="p" style={{ color: documentsVerified ? "#15803d" : "#b45309", fontWeight: "bold" }}>
        {documentsVerified ? "Toutes vérifiées par l'équipe" : "Vérification en cours par l'équipe"}
      </span>,
    ]);
  }
  if (effectiveDate) rows.push(["Entrée prévue", effectiveDate]);

  const parties = [owner, (tenantName || "").trim()].filter(Boolean).join(" / ");
  const preview = [
    parties || clientName,
    documentsVerified ? "pièces vérifiées" : null,
    effectiveDate ? `entrée prévue le ${effectiveDate}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <EmailLayout preview={`${preview}.`} reference={["Espace notaire", "Nouveau dossier"]}>
      <Title>Un nouveau dossier vous est confié</Title>
      <Lead>Maître, voici le résumé du dossier que nous venons de vous transmettre :</Lead>
      <KeyValues rows={rows} />
      {notes && notes.trim() && <Quote author="Un mot de l'équipe">{notes.trim()}</Quote>}
      <Actions primary={{ label: "Ouvrir le dossier", href: interfaceUrl }} />
      <Sign closing="Bien cordialement," />
    </EmailLayout>
  );
}

MailNotaireAssignment.PreviewProps = {
  userName: "Claire Durand",
  clientName: "Thomas Bernard",
  propertyAddress: "12 rue des Lilas, 75011 Paris · 43 m²",
  bailTypeLabel: "Location vide, 3 ans",
  ownerName: "Thomas Bernard",
  tenantName: "Léa Martin",
  rentText: "1 100 € + 95 € de charges",
  documentsVerified: true,
  effectiveDate: "1er décembre 2026",
  notes: "Le locataire souhaite signer en fin de semaine.",
  interfaceUrl: "https://www.bailnotarie.fr/notaire/dossiers",
} satisfies MailNotaireAssignmentProps;
