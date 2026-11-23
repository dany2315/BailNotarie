import * as React from "react";
import { EmailLayout, Title, Lead, Actions } from "./_shared/layout";

interface MailNotificationProps {
  userName?: string | null;
  notificationMessage: string;
  interfaceUrl: string;
}

/** Objet : le message de la notification lui-même, plutôt qu'un objet générique. */
export function notificationSubject(notificationMessage: string) {
  const text = (notificationMessage || "").replace(/\s+/g, " ").trim();
  if (!text) return "Nouvelle notification BailNotarie";
  return text.length > 90 ? `${text.slice(0, 89)}…` : text;
}

/** Notification de l'interface, envoyée à un membre de l'équipe. */
export default function MailNotification({ notificationMessage, interfaceUrl }: MailNotificationProps) {
  return (
    <EmailLayout preview={notificationMessage} reference={["Interface", "Notification"]} footerNote="Notification interne BailNotarie">
      <Title>{notificationMessage}</Title>
      <Lead small>Le détail est dans l'interface, sur la fiche concernée.</Lead>
      <Actions primary={{ label: "Ouvrir dans l'interface", href: interfaceUrl }} />
    </EmailLayout>
  );
}

MailNotification.PreviewProps = {
  userName: "Laetitia",
  notificationMessage: "Thomas Bernard a envoyé son formulaire propriétaire (12 rue des Lilas, 75011 Paris)",
  interfaceUrl: "https://www.bailnotarie.fr/interface/notifications",
} satisfies MailNotificationProps;
