import * as React from "react";
import { EmailLayout, Kicker, Title, KeyValues, Quote, Actions } from "./_shared/layout";

interface MailNotificationEquipeProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  dateDemande: string;
}

/** Objet : ce qu'il faut faire et qui rappeler. */
export function contactTeamSubject(firstName: string, lastName: string) {
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "nouveau contact";
  return `À rappeler sous 24 h ouvrées : ${name}`;
}

/** Nouvelle demande de contact depuis le site, pour l'équipe. */
export default function MailNotificationEquipe({ firstName, lastName, email, phone, message, dateDemande }: MailNotificationEquipeProps) {
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "Un visiteur";
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
  return (
    <EmailLayout
      preview={`${phone || email} · « ${(message || "").trim().slice(0, 90)}${(message || "").trim().length > 90 ? "…" : ""} »`}
      reference={["Demande du site", dateDemande]}
      footerNote="Notification interne BailNotarie"
    >
      <Kicker tone="amber">À rappeler sous 24 h ouvrées</Kicker>
      <Title>{name} a écrit depuis le site</Title>
      <KeyValues
        rows={[
          ["Téléphone", phone || "Non renseigné"],
          ["E-mail", email],
          ["Reçue le", dateDemande],
        ]}
      />
      {message && message.trim() && <Quote>« {message.trim()} »</Quote>}
      <Actions
        primary={telHref ? { label: "Appeler", href: telHref } : { label: "Répondre par e-mail", href: `mailto:${email}` }}
        secondary={telHref ? { label: "Répondre par e-mail", href: `mailto:${email}` } : undefined}
      />
    </EmailLayout>
  );
}

MailNotificationEquipe.PreviewProps = {
  firstName: "Thomas",
  lastName: "Bernard",
  email: "thomas.bernard@exemple.fr",
  phone: "06 12 34 56 78",
  message: "Bonjour, je loue un T2 à Paris 11e à partir de janvier et je voudrais un bail notarié. Comment ça se passe ?",
  dateDemande: "22/11/2026 à 18 h 42",
} satisfies MailNotificationEquipeProps;
