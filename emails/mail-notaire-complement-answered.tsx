import * as React from "react";
import { EmailLayout, Title, Lead, FileLine, Actions } from "./_shared/layout";

interface MailNotaireComplementAnsweredProps {
  notaireName?: string | null;
  clientName: string;
  /** Éléments demandés et fournis (intitulés). */
  itemLabels: string[];
  bailAddress?: string | null;
  dossierUrl: string;
}

/** Nombre d'éléments, pour l'objet : « 2 éléments à valider ». */
export function complementAnsweredSubject(clientName: string, count: number) {
  return `${count > 1 ? `${count} éléments` : "1 élément"} à valider : réponse de ${clientName}`;
}

/** Le client a répondu à une demande de compléments du notaire. */
export default function MailNotaireComplementAnswered({ clientName, itemLabels, bailAddress, dossierUrl }: MailNotaireComplementAnsweredProps) {
  const count = itemLabels.length;
  return (
    <EmailLayout
      preview={`${clientName} a envoyé : ${itemLabels.slice(0, 3).join(", ")}${count > 3 ? "…" : ""}.`}
      reference={bailAddress ? ["Dossier", bailAddress] : ["Espace notaire"]}
    >
      <Title>{clientName} a répondu à votre demande</Title>
      <Lead>
        Maître, {count > 1 ? `les ${count} éléments demandés sont arrivés` : "l'élément demandé est arrivé"}. Il ne reste qu'à{" "}
        {count > 1 ? "les" : "le"} valider ou à {count > 1 ? "les" : "le"} redemander :
      </Lead>
      {itemLabels.map((label, index) => (
        <FileLine key={`${label}-${index}`} name={label} status="à valider" />
      ))}
      <Actions primary={{ label: count > 1 ? `Valider les ${count} éléments` : "Valider l'élément", href: dossierUrl }} />
    </EmailLayout>
  );
}

MailNotaireComplementAnswered.PreviewProps = {
  notaireName: "Claire Durand",
  clientName: "Thomas Bernard",
  itemLabels: ["Pièce d'identité de Thomas Bernard", "Règlement de copropriété"],
  bailAddress: "12 rue des Lilas, 75011 Paris",
  dossierUrl: "https://www.bailnotarie.fr/notaire/dossiers",
} satisfies MailNotaireComplementAnsweredProps;
