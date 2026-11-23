import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, Steps, InfoCard, Actions, Sign } from "./_shared/layout";

interface MailCompletionStatusProps {
  clientName?: string | null;
  entityType: "client" | "property";
  entityName?: string | null;
  oldStatus: string;
  newStatus: string;
  dashboardUrl: string;
  profilType?: "PROPRIETAIRE" | "LOCATAIRE";
  /** Tout le dossier est vérifié : le bien, le propriétaire et le locataire. */
  dossierValidated?: boolean;
  /** « Maître Durand » si un notaire est déjà assigné. */
  notaireName?: string | null;
  /** L'autre partie : le locataire pour le propriétaire, le propriétaire pour le locataire. */
  otherPartyName?: string | null;
  propertyAddress?: string | null;
}

/** Objet de l'e-mail selon le nouveau statut (utilisé par les actions qui déclenchent l'envoi). */
export function completionStatusSubject(
  newStatus: string,
  entityType: "client" | "property",
  options: { dossierValidated?: boolean; clientName?: string | null } = {},
) {
  if (newStatus === "PENDING_CHECK") return "Nous vérifions votre dossier, rien à faire pour l'instant";
  if (newStatus === "COMPLETED" && options.dossierValidated) {
    const name = (options.clientName || "").trim();
    return `Dossier validé${name ? `, ${name}` : ""} : place au notaire`;
  }
  if (newStatus === "COMPLETED") return entityType === "property" ? "Les informations de votre bien sont validées" : "Vos informations sont validées";
  return "Votre dossier de bail notarié avance";
}

/** Le statut de vérification des informations du client ou de son bien a changé. */
export default function MailCompletionStatus({
  clientName,
  entityType,
  entityName,
  newStatus,
  dashboardUrl,
  profilType,
  dossierValidated,
  notaireName,
  otherPartyName,
  propertyAddress,
}: MailCompletionStatusProps) {
  const hello = clientName ? `Bonjour ${clientName}, ` : "Bonjour, ";
  const what = entityType === "property" ? "les informations de votre bien" : "vos informations";
  const address = (propertyAddress || "").trim() || (entityType === "property" ? (entityName || "").trim() : "");
  const reference = address ? ["Dossier", address] : ["Votre bail notarié"];
  const footerNote = "Vous recevez cet e-mail car votre dossier de bail notarié avance.";

  if (newStatus === "PENDING_CHECK") {
    return (
      <EmailLayout preview="Si un élément manque, nous vous dirons précisément lequel. Retour sous 24 h ouvrées." reference={reference} footerNote={footerNote}>
        <Steps steps={["Votre dossier", "Vérification", "Notaire", "Signature"]} current={1} />
        <Title>Votre dossier est entre de bonnes mains</Title>
        <Lead>{hello}notre équipe relit vos informations et vos pièces pour que le notaire reçoive un dossier sans erreur. Vous n'avez rien à faire pour l'instant.</Lead>
        <InfoCard label="Et ensuite ?">
          Si tout est en ordre, nous transmettons votre dossier au notaire. S'il manque un élément, nous vous écrivons sous 24 h ouvrées avec la
          liste exacte et un lien pour l'envoyer.
        </InfoCard>
        <Actions secondary={{ label: "Voir mon dossier", href: dashboardUrl }} />
        <Sign />
      </EmailLayout>
    );
  }

  if (newStatus === "COMPLETED" && dossierValidated) {
    const other = (otherPartyName || "").trim();
    const others = other ? `celles du bien et celles de ${other}` : `celles du bien et celles ${profilType === "LOCATAIRE" ? "de votre propriétaire" : "de votre locataire"}`;
    const notaire = (notaireName || "").trim();
    return (
      <EmailLayout
        preview={`Tout est vérifié. ${notaire || "Le notaire"} va vous contacter pour fixer la signature.`}
        reference={reference}
        footerNote={footerNote}
      >
        <Steps steps={["Votre dossier", "Vérification", "Notaire", "Signature"]} current={2} />
        <Kicker>Bonne nouvelle</Kicker>
        <Title>Votre dossier est validé</Title>
        <Lead>
          {hello}vos informations, {others} sont vérifiées. Nous transmettons votre dossier à{" "}
          {notaire ? <b>{notaire}</b> : "notre notaire partenaire"}
          {notaire ? ", notaire partenaire, qui" : ", qui"} vous contactera pour fixer la date de signature.
        </Lead>
        <InfoCard label="Ce que fera le notaire">
          Il prépare l'acte, vous communique le montant exact des frais et organise la signature avec{" "}
          {profilType === "LOCATAIRE" ? "vous et votre propriétaire" : "vous et votre locataire"}.
        </InfoCard>
        <Actions primary={{ label: "Voir mon dossier", href: dashboardUrl }} />
        <Sign closing="Merci de votre confiance," />
      </EmailLayout>
    );
  }

  if (newStatus === "COMPLETED") {
    return (
      <EmailLayout preview={`${what.charAt(0).toUpperCase()}${what.slice(1)} sont vérifiées et conformes.`} reference={reference} footerNote={footerNote}>
        <Steps steps={["Votre dossier", "Vérification", "Notaire", "Signature"]} current={2} />
        <Kicker>Bonne nouvelle</Kicker>
        <Title>{entityType === "property" ? "Les informations de votre bien sont validées" : "Vos informations sont validées"}</Title>
        <Lead>
          {hello}
          {what} sont vérifiées et conformes. Dès que le dossier est complet, nous le transmettons au notaire partenaire, qui vous contactera
          pour fixer la date de signature.
        </Lead>
        <InfoCard label="Ce que fera le notaire">
          Il prépare l'acte, vous communique le montant exact des frais et organise la signature avec toutes les parties.
        </InfoCard>
        <Actions primary={{ label: "Voir mon dossier", href: dashboardUrl }} />
        <Sign closing="Merci de votre confiance," />
      </EmailLayout>
    );
  }

  return (
    <EmailLayout preview="Le statut de votre dossier a été mis à jour." reference={reference} footerNote={footerNote}>
      <Title>Votre dossier avance</Title>
      <Lead>{hello}le statut de vérification de {what} a été mis à jour. Retrouvez le détail dans votre espace.</Lead>
      <Actions primary={{ label: "Voir mon dossier", href: dashboardUrl }} />
      <Sign />
    </EmailLayout>
  );
}

MailCompletionStatus.PreviewProps = {
  clientName: "Thomas Bernard",
  entityType: "client",
  oldStatus: "PENDING_CHECK",
  newStatus: "COMPLETED",
  dashboardUrl: "https://www.bailnotarie.fr/client/proprietaire",
  profilType: "PROPRIETAIRE",
  dossierValidated: true,
  notaireName: "Maître Claire Durand",
  otherPartyName: "Léa Martin",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
} satisfies MailCompletionStatusProps;
