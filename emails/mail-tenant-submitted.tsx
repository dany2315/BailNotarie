import * as React from "react";
import { EmailLayout, Title, Lead, Steps, Actions, Sign } from "./_shared/layout";

interface MailTenantSubmittedProps {
  ownerFirstName: string;
  ownerLastName: string;
  tenantFirstName: string;
  tenantLastName: string;
  propertyAddress?: string;
  interfaceUrl: string;
}

/** Le locataire a envoyé son formulaire : on prévient le propriétaire. */
export default function MailTenantSubmitted({ ownerFirstName, tenantFirstName, tenantLastName, propertyAddress, interfaceUrl }: MailTenantSubmittedProps) {
  const owner = (ownerFirstName || "").trim();
  const tenant = `${tenantFirstName || ""} ${tenantLastName || ""}`.trim() || "Votre locataire";
  return (
    <EmailLayout
      preview="Nous vérifions maintenant ses informations, puis le notaire vous contacte pour la signature."
      reference={propertyAddress ? ["Dossier", propertyAddress] : ["Votre bail notarié"]}
      footerNote="Vous recevez cet e-mail car vous suivez ce dossier de bail notarié."
    >
      <Steps steps={["Vous", tenant, "Vérification", "Signature"]} current={2} />
      <Title>Votre locataire a fait sa part</Title>
      <Lead>
        {owner ? `Bonne nouvelle ${owner} : ` : "Bonne nouvelle : "}
        {tenant} a complété ses informations{propertyAddress ? ` pour le bail du ${propertyAddress}` : ""}. Nous les vérifions, puis le notaire
        vous contacte pour la signature.
      </Lead>
      <Actions primary={{ label: "Voir l'avancement", href: interfaceUrl }} />
      <Sign />
    </EmailLayout>
  );
}

MailTenantSubmitted.PreviewProps = {
  ownerFirstName: "Thomas",
  ownerLastName: "Bernard",
  tenantFirstName: "Léa",
  tenantLastName: "Martin",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  interfaceUrl: "https://www.bailnotarie.fr/client",
} satisfies MailTenantSubmittedProps;
