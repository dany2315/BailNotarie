import * as React from "react";
import { EmailLayout, Title, Lead, FileLine, Actions, absoluteUrl } from "./_shared/layout";

interface MailDocumentReceivedProps {
  notaireName?: string | null;
  clientName: string;
  requestTitle: string;
  documentNames: string[];
  bailAddress?: string | null;
  chatUrl: string;
}

/** Le client a envoyé la pièce demandée par le notaire. */
export default function MailDocumentReceived({ clientName, requestTitle, documentNames, bailAddress, chatUrl }: MailDocumentReceivedProps) {
  const client = typeof clientName === "string" && clientName.trim() ? clientName.trim() : "Votre client";
  const title = typeof requestTitle === "string" && requestTitle.trim() ? requestTitle.trim() : "Demande de document";
  const names = (Array.isArray(documentNames) ? documentNames : []).filter((name): name is string => typeof name === "string" && name.trim().length > 0);
  const files = names.length > 0 ? names : ["Document"];
  return (
    <EmailLayout
      preview={`${client} a envoyé ${files.length > 1 ? `${files.length} documents` : files[0]}. À valider dans le dossier.`}
      reference={bailAddress ? ["Dossier", bailAddress] : ["Espace notaire"]}
    >
      <Title>
        {client} a répondu à votre demande « {title} »
      </Title>
      <Lead>Maître, {files.length > 1 ? "les pièces que vous aviez demandées sont arrivées" : "la pièce que vous aviez demandée est arrivée"}{bailAddress ? ` dans le dossier du ${bailAddress}` : ""} :</Lead>
      {files.map((name, index) => (
        <FileLine key={`${name}-${index}`} name={name} status="reçue aujourd'hui" />
      ))}
      <Actions primary={{ label: "Voir et valider", href: absoluteUrl(chatUrl) }} />
    </EmailLayout>
  );
}

MailDocumentReceived.PreviewProps = {
  notaireName: "Claire Durand",
  clientName: "Léa Martin",
  requestTitle: "Attestation d'assurance habitation",
  documentNames: ["attestation-assurance-martin.pdf"],
  bailAddress: "12 rue des Lilas, 75011 Paris",
  chatUrl: "https://www.bailnotarie.fr/notaire/dossiers",
} satisfies MailDocumentReceivedProps;
