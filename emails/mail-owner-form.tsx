import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, Steps, InfoCard, Actions, Hint, Trust, Sign } from "./_shared/layout";

interface MailOwnerFormProps {
  firstName: string;
  lastName: string;
  formUrl: string;
  emailContext?: "landing_owner" | "landing_tenant" | "admin" | "default";
}

const TO_PREPARE =
  "Votre pièce d'identité · l'adresse et la surface du bien · le loyer et les charges · vos diagnostics (DPE, électricité, gaz…) · l'e-mail de votre locataire si vous l'avez déjà.";

/**
 * Lien du formulaire propriétaire.
 * - admin : l'équipe ouvre le dossier (après un échange, le plus souvent) ;
 * - default / landing_tenant : le locataire a indiqué ce propriétaire ;
 * - landing_owner : le propriétaire a démarré seul.
 */
export default function MailOwnerForm({ firstName, formUrl, emailContext = "default" }: MailOwnerFormProps) {
  const name = (firstName || "").trim();

  if (emailContext === "default" || emailContext === "landing_tenant") {
    return (
      <EmailLayout
        preview="Votre locataire souhaite un bail signé chez le notaire. Complétez votre partie en quelques minutes."
        reference={["Votre bail notarié", "Profil propriétaire"]}
        footerNote="Vous recevez cet e-mail car votre locataire vous a indiqué comme propriétaire."
      >
        <Steps steps={["Votre locataire", "Votre dossier", "Vérification", "Signature"]} current={1} />
        <Kicker>Votre locataire a fait la demande</Kicker>
        <Title>{name ? `${name}, votre` : "Votre"} locataire vous propose un bail notarié</Title>
        <Lead>
          Votre locataire a démarré un bail notarié et vous a indiqué comme propriétaire. Renseignez vos informations, celles du bien et les
          conditions du bail : nous vérifions tout avant de le confier au notaire.
        </Lead>
        <InfoCard label="À préparer avant de commencer">{TO_PREPARE}</InfoCard>
        <Actions primary={{ label: "Compléter mon dossier", href: formUrl }} />
        <Hint>Vous pouvez vous arrêter à tout moment : vos réponses sont conservées.</Hint>
        <Trust title="Pourquoi un bail notarié ?">
          En cas d'impayé, le bail notarié permet d'agir sans attendre un jugement. Vous louez plus sereinement, dès le premier jour.
        </Trust>
        <Sign help="Une question en remplissant ? Répondez à cet e-mail, un conseiller vous aide." />
      </EmailLayout>
    );
  }

  const fromTeam = emailContext === "admin";
  return (
    <EmailLayout
      preview={
        fromTeam
          ? "Suite à notre échange, votre dossier est prêt. Vos réponses sont enregistrées au fur et à mesure."
          : "Vos réponses sont enregistrées au fur et à mesure : remplissez en une fois ou en plusieurs."
      }
      reference={["Votre bail notarié", "Profil propriétaire"]}
      footerNote="Vous recevez cet e-mail car un dossier de bail notarié a été ouvert à votre nom."
    >
      <Steps steps={[fromTeam ? "Échange avec nous" : "Profil choisi", "Votre dossier", "Vérification", "Signature"]} current={1} />
      <Title>{name ? `${name}, votre` : "Votre"} dossier est prêt, à vous de jouer</Title>
      <Lead>
        {fromTeam ? "Suite à notre échange, nous avons ouvert" : "Nous avons ouvert"} votre dossier de bail notarié. Renseignez vos informations,
        celles du bien et les conditions du bail : nous vérifions tout avant de le confier au notaire.
      </Lead>
      <InfoCard label="À préparer avant de commencer">{TO_PREPARE}</InfoCard>
      <Actions primary={{ label: "Compléter mon dossier", href: formUrl }} />
      <Hint>Vous pouvez vous arrêter à tout moment : vos réponses sont conservées.</Hint>
      <Trust title="Pourquoi un bail notarié ?">
        En cas d'impayé, le bail notarié permet d'agir sans attendre un jugement. Vous louez plus sereinement, dès le premier jour.
      </Trust>
      <Sign help="Une question en remplissant ? Répondez à cet e-mail, un conseiller vous aide." />
    </EmailLayout>
  );
}

MailOwnerForm.PreviewProps = {
  firstName: "Thomas",
  lastName: "Bernard",
  formUrl: "https://www.bailnotarie.fr/intakes/exemple",
  emailContext: "admin",
} satisfies MailOwnerFormProps;
