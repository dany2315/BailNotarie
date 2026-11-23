import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, NumberedList, Steps, InfoCard, Actions, Hint, Trust, Sign, HELP_REPLY_OR_CALL } from "./_shared/layout";

interface MailLeadConversionProps {
  convertUrl: string;
  isOwnerForm?: boolean;
  isTenantForm?: boolean;
}

/** Ajoute le profil choisi au lien de conversion : la page présélectionne propriétaire ou locataire. */
function withRole(url: string, role: "proprietaire" | "locataire") {
  return `${url}${url.includes("?") ? "&" : "?"}role=${role}`;
}

export default function MailLeadConversion({ convertUrl, isOwnerForm = false, isTenantForm = false }: MailLeadConversionProps) {
  // Profil propriétaire choisi : le dossier est ouvert.
  if (isOwnerForm) {
    return (
      <EmailLayout
        preview="Vos réponses sont enregistrées au fur et à mesure : remplissez en une fois ou en plusieurs."
        reference={["Votre bail notarié", "Profil propriétaire"]}
        footerNote="Vous recevez cet e-mail car vous avez choisi le profil propriétaire sur BailNotarie."
      >
        <Steps steps={["Profil choisi", "Votre dossier", "Vérification", "Signature"]} current={1} />
        <Title>Votre dossier propriétaire est ouvert</Title>
        <Lead>
          Merci ! Il ne reste qu'une étape avant que nous vérifiions votre dossier : vos informations, celles du bien et les conditions du bail.
          Comptez quelques minutes si vous avez tout sous la main.
        </Lead>
        <InfoCard label="À préparer avant de commencer">
          Votre pièce d'identité · l'adresse et la surface du bien · le loyer et les charges · vos diagnostics (DPE, électricité, gaz…) · l'e-mail
          de votre locataire si vous l'avez déjà.
        </InfoCard>
        <Actions primary={{ label: "Compléter mon dossier", href: convertUrl }} />
        <Hint>Vous pouvez vous arrêter à tout moment : vos réponses sont conservées.</Hint>
        <Sign help="Une question en remplissant ? Répondez à cet e-mail, un conseiller vous aide." />
      </EmailLayout>
    );
  }

  // Profil locataire choisi (variante prévue, pas envoyée aujourd'hui).
  if (isTenantForm) {
    return (
      <EmailLayout
        preview="Vos réponses sont enregistrées au fur et à mesure : remplissez en une fois ou en plusieurs."
        reference={["Votre bail notarié", "Profil locataire"]}
        footerNote="Vous recevez cet e-mail car vous avez choisi le profil locataire sur BailNotarie."
      >
        <Steps steps={["Profil choisi", "Vos informations", "Vérification", "Signature"]} current={1} />
        <Title>Votre dossier locataire est ouvert</Title>
        <Lead>Merci ! Renseignez votre identité, vos coordonnées et votre situation familiale : le notaire en a besoin pour rédiger le bail.</Lead>
        <Actions primary={{ label: "Compléter mes informations", href: convertUrl }} />
        <Hint>Vous pouvez vous arrêter à tout moment : vos réponses sont conservées.</Hint>
        <Sign help="Une question en remplissant ? Répondez à cet e-mail, un conseiller vous aide." />
      </EmailLayout>
    );
  }

  // Bienvenue : choisir son profil.
  return (
    <EmailLayout
      preview="Dites-nous si vous êtes propriétaire ou locataire : votre dossier démarre en un clic."
      reference={["Bail notarié en ligne", "avec un notaire partenaire"]}
      footerNote="Vous recevez cet e-mail suite à votre demande d'information sur le bail notarié."
    >
      <Kicker>Bienvenue</Kicker>
      <Title>Louez l'esprit tranquille, avec un bail signé chez le notaire</Title>
      <Lead>
        Bonjour, merci de l'intérêt que vous portez à BailNotarie. Nous préparons votre bail avec un notaire partenaire, de la collecte des pièces
        jusqu'à la signature. Vous n'avez rien à chercher : on vous guide à chaque étape.
      </Lead>
      <NumberedList
        items={[
          {
            title: "Un recours rapide en cas d'impayé.",
            text: "Le bail notarié a force exécutoire : le commissaire de justice peut agir sans attendre un jugement.",
          },
          { title: "Un bail conforme, relu par un notaire.", text: "Les clauses suivent la loi en vigueur et tiennent en cas de litige." },
          { title: "Tout se fait en ligne.", text: "Vous remplissez, nous vérifions, le notaire signe avec vous." },
        ]}
      />
      <Lead strong>Pour démarrer, vous êtes :</Lead>
      <Actions
        primary={{ label: "Je suis propriétaire", href: withRole(convertUrl, "proprietaire") }}
        secondary={{ label: "Je suis locataire", href: withRole(convertUrl, "locataire") }}
      />
      <Hint>Un clic suffit, vous arrivez directement sur le bon formulaire.</Hint>
      <Trust title="Des tarifs clairs, annoncés dès le départ.">
        Nos frais de dossier couvrent la préparation complète de votre dossier, la vérification des pièces et le suivi jusqu'à la signature. Les
        frais de l'acte notarié vous sont communiqués par le notaire avant la signature : aucune surprise.
      </Trust>
      <Sign help={HELP_REPLY_OR_CALL} />
    </EmailLayout>
  );
}

MailLeadConversion.PreviewProps = {
  convertUrl: "https://www.bailnotarie.fr/intakes/exemple/convert",
} satisfies MailLeadConversionProps;
