import * as React from "react";
import { EmailLayout, Title, Lead, Steps, NumberedList, InfoCard, Actions, Hint, Sign, HELP_REPLY } from "./_shared/layout";

interface MailTenantFormProps {
  firstName: string;
  lastName: string;
  formUrl: string;
  /** Nom du propriétaire, s'il est connu. */
  ownerName?: string | null;
  /** Adresse du bien, si elle est connue. */
  propertyAddress?: string | null;
  /** « logement » (habitation) ou « local » (commercial). */
  premisesWord?: "logement" | "local";
}

/** Formulaire du locataire : son propriétaire prépare le bail avec un notaire. */
export default function MailTenantForm({ firstName, formUrl, ownerName, propertyAddress, premisesWord = "logement" }: MailTenantFormProps) {
  const name = (firstName || "").trim();
  const owner = (ownerName || "").trim();
  const address = (propertyAddress || "").trim();
  const who = owner ? `${owner}, votre propriétaire,` : "votre propriétaire";
  return (
    <EmailLayout
      preview={`${owner || "Votre propriétaire"} prépare votre bail avec un notaire. Complétez vos informations en quelques minutes.`}
      reference={address ? ["Logement", address] : ["Votre bail notarié", "Profil locataire"]}
      footerNote={`Vous recevez cet e-mail car ${owner || "votre propriétaire"} vous a indiqué comme locataire.`}
    >
      <Steps steps={["Propriétaire", "Vous", "Vérification", "Signature"]} current={1} />
      <Title>Votre bail notarié est en préparation</Title>
      <Lead>
        {name ? `Bonjour ${name}, ` : "Bonjour, "}
        {who} prépare votre bail
        {address ? (
          <>
            {" "}
            pour le {premisesWord} du <b>{address}</b>
          </>
        ) : null}{" "}
        avec un notaire partenaire. Il ne manque plus que vos informations.
      </Lead>
      <NumberedList
        items={[
          { title: "Un bail clair et vérifié par un notaire.", text: "Vos droits sont écrits noir sur blanc et conformes à la loi." },
          { title: "Vos données restent confidentielles.", text: "Elles ne servent qu'à la rédaction de votre bail." },
        ]}
      />
      <InfoCard label="Ce qu'on va vous demander">
        Votre identité et vos coordonnées, et votre situation familiale (mariage, PACS) : le notaire en a besoin pour rédiger l'acte.
      </InfoCard>
      <Actions primary={{ label: "Compléter mes informations", href: formUrl }} />
      <Hint>Vous pouvez vous arrêter à tout moment : vos réponses sont conservées.</Hint>
      <Sign help={HELP_REPLY} />
    </EmailLayout>
  );
}

MailTenantForm.PreviewProps = {
  firstName: "Léa",
  lastName: "Martin",
  formUrl: "https://www.bailnotarie.fr/intakes/exemple",
  ownerName: "Thomas Bernard",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
} satisfies MailTenantFormProps;
