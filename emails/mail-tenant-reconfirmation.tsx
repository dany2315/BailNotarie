import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, InfoCard, Compare, Actions, Sign, HELP_REPLY } from "./_shared/layout";

export interface MailTenantReconfirmationProps {
  /** Nom après « Bonjour » ; vide si inconnu. */
  name: string;
  /** Adresse du logement ou du local. */
  address: string;
  /** Libellés des conditions modifiées (« Loyer », « Charges »…). */
  changedLabels: string[];
  /** Avant / après de chaque condition modifiée, si connu. */
  changes?: Array<{ label: string; before: string; after: string }>;
  /** Page du dossier dans l'espace locataire. */
  actionUrl: string;
}

function changedText(changedLabels: string[]) {
  const labels = changedLabels.map((label) => label.toLowerCase());
  if (labels.length === 0) return "certaines conditions";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

/** Objet de l'e-mail, avec le prénom du locataire. */
export function tenantReconfirmationSubject(name: string) {
  const first = name.trim();
  return `${first ? `${first}, les` : "Les"} conditions de votre bail ont changé : merci de confirmer`;
}

/**
 * Un seul message, envoyé quand le propriétaire ou l'équipe modifie des conditions que le locataire avait
 * déjà acceptées. Pas de relance automatique (décision de l'utilisateur du 17/11/2026, M15).
 */
export default function MailTenantReconfirmation({ name, address, changedLabels, changes, actionUrl }: MailTenantReconfirmationProps) {
  const changed = changedText(changedLabels);
  const plural = changedLabels.length !== 1;
  const detail = (changes || []).filter((change) => change.before !== change.after);
  const preview =
    detail.length > 0
      ? `${detail.map((change, i) => `${i === 0 ? change.label : change.label.toLowerCase()} ${change.before} → ${change.after}`).join(", ")}. Une confirmation suffit.`
      : `Modifié : ${changed}. Une confirmation suffit pour que le notaire avance.`;
  return (
    <EmailLayout
      preview={preview}
      reference={["Logement", address]}
      footerNote="Vous recevez cet e-mail car les conditions de votre bail ont été modifiées."
    >
      <Kicker>Votre accord est demandé</Kicker>
      <Title>Les conditions de votre bail ont changé</Title>
      <Lead>
        {name ? `Bonjour ${name}, ` : "Bonjour, "}
        {plural ? "des conditions que vous aviez acceptées ont été modifiées" : "une condition que vous aviez acceptée a été modifiée"} pour le bail
        du {address}.{detail.length > 0 ? " Voici le détail :" : ""}
      </Lead>
      {detail.length > 0 ? (
        <Compare rows={detail} />
      ) : (
        <InfoCard label={plural ? "Conditions modifiées" : "Condition modifiée"}>
          {changedLabels.length > 0 ? changedLabels.join(" · ") : "Conditions du bail"}
          {"\n"}Le détail, avant et après, est dans votre espace.
        </InfoCard>
      )}
      <Lead>Le notaire ne peut préparer l'acte qu'avec votre accord sur ces nouvelles conditions.</Lead>
      <Actions primary={{ label: "Relire et confirmer", href: actionUrl }} />
      <Sign help={`${HELP_REPLY.replace("Une question ?", "Une question sur ce changement ?")}`} />
    </EmailLayout>
  );
}

MailTenantReconfirmation.PreviewProps = {
  name: "Léa",
  address: "12 rue des Lilas, 75011 Paris",
  changedLabels: ["Loyer", "Charges"],
  changes: [
    { label: "Loyer", before: "1 150 €", after: "1 100 €" },
    { label: "Charges", before: "80 €", after: "95 €" },
  ],
  actionUrl: "https://www.bailnotarie.fr/client/locataire/baux/exemple",
} satisfies MailTenantReconfirmationProps;
