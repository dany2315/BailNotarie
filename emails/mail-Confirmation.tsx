import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, NumberedList, Steps, InfoCard, Quote, Actions, Trust, Sign, HELP_REPLY, HELP_REPLY_OR_CALL, PHONE } from "./_shared/layout";
import { EMAIL_BASE_URL } from "./_shared/urls";

interface MailConfirmationProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
  role?: "LOCATAIRE" | "PROPRIETAIRE";
  /** Adresse du bien, si le dossier est connu. */
  propertyAddress?: string | null;
  /** Nom du propriétaire (confirmation du locataire). */
  ownerName?: string | null;
  /** Nom du locataire (confirmation du propriétaire). */
  tenantName?: string | null;
  /** Le formulaire a déjà été envoyé au locataire ; inconnu si absent. */
  tenantInvited?: boolean;
}

/**
 * Trois e-mails dans un même modèle :
 * - confirmation du formulaire de contact du site (un message est présent) ;
 * - confirmation d'envoi du formulaire propriétaire (role PROPRIETAIRE) ;
 * - confirmation d'envoi du formulaire locataire (role LOCATAIRE).
 */
export default function MailConfirmation({ firstName, phone, message, role, propertyAddress, ownerName, tenantName, tenantInvited }: MailConfirmationProps) {
  const name = (firstName || "").trim();
  const address = (propertyAddress || "").trim();
  const tenant = (tenantName || "").trim();
  const owner = (ownerName || "").trim();
  const dossierUrl = `${EMAIL_BASE_URL}/client`;

  if (role === "PROPRIETAIRE") {
    return (
      <EmailLayout
        preview="Voici les 3 prochaines étapes jusqu'à la signature chez le notaire."
        reference={address ? ["Dossier", address] : ["Votre bail notarié", "Profil propriétaire"]}
        footerNote="Vous recevez cet e-mail car vous venez d'envoyer votre dossier de bail notarié."
      >
        <Steps steps={["Votre dossier", "Vérification", "Notaire", "Signature"]} current={1} />
        <Title>Bravo, votre part est faite</Title>
        <Lead>{name ? `Merci ${name}, votre` : "Merci, votre"} formulaire est bien envoyé. Voici ce qui se passe maintenant :</Lead>
        <NumberedList
          items={[
            { title: "Nous vérifions votre dossier.", text: "Si un élément manque, nous vous le disons précisément, sous 24 h ouvrées." },
            tenantInvited === true
              ? {
                  title: `${tenant || "Votre locataire"} complète ses informations.`,
                  text: "Nous venons de lui écrire. Pensez à lui dire de regarder ses indésirables.",
                }
              : tenantInvited === false
                ? {
                    title: "Indiquez votre locataire.",
                    text: "Dès que vous l'avez trouvé, ajoutez son e-mail depuis votre espace : nous lui écrirons pour qu'il complète ses informations.",
                  }
                : {
                    title: "Votre locataire complète ses informations.",
                    text: "Si vous nous avez indiqué son e-mail, nous venons de lui écrire : pensez à lui dire de regarder ses indésirables. Sinon, indiquez-le depuis votre espace dès que vous l'avez trouvé.",
                  },
            { title: "Le notaire vous contacte.", text: "Il fixe la signature avec vous et vous donne le montant exact de l'acte." },
          ]}
        />
        <Actions primary={{ label: "Suivre mon dossier", href: dossierUrl }} />
        <Sign closing="Merci de votre confiance," help={HELP_REPLY_OR_CALL} />
      </EmailLayout>
    );
  }

  if (role === "LOCATAIRE") {
    return (
      <EmailLayout
        preview="C'est tout bon de votre côté. Voici la suite jusqu'à la signature."
        reference={address ? ["Logement", address] : ["Votre bail notarié", "Profil locataire"]}
        footerNote="Vous recevez cet e-mail car vous venez d'envoyer vos informations de locataire."
      >
        <Steps steps={["Propriétaire", "Vous", "Vérification", "Signature"]} current={2} />
        <Title>C'est tout bon de votre côté</Title>
        <Lead>
          {name ? `Merci ${name} ! ` : "Merci ! "}Vos informations sont bien transmises. Nous vérifions maintenant le dossier complet, puis le
          notaire vous contacte, vous et {owner || "votre propriétaire"}, pour fixer la signature.
        </Lead>
        <InfoCard label="Ce qui vous attend">
          Un bail clair, vérifié par un notaire et conforme à la loi. Vous en recevrez une copie authentique après la signature.
        </InfoCard>
        <Actions primary={{ label: "Voir mon dossier", href: dossierUrl }} />
        <Sign help={HELP_REPLY} />
      </EmailLayout>
    );
  }

  // Formulaire de contact du site.
  return (
    <EmailLayout
      preview="Et si vous voulez gagner du temps, votre dossier peut déjà démarrer en ligne."
      reference={["Votre demande", "bien reçue"]}
      footerNote="Vous recevez cet e-mail suite à votre message sur www.bailnotarie.fr."
    >
      <Kicker>Demande bien reçue</Kicker>
      <Title>{name ? `Merci ${name}, un` : "Merci, un"} conseiller vous rappelle sous 24 h ouvrées</Title>
      <Lead>
        {phone ? (
          <>
            Nous vous appellerons au <b>{phone}</b> pour comprendre votre projet et vous expliquer comment se passe le bail notarié, étape par
            étape.
          </>
        ) : (
          "Nous revenons vers vous pour comprendre votre projet et vous expliquer comment se passe le bail notarié, étape par étape."
        )}
      </Lead>
      {message && message.trim() && <Quote>« {message.trim()} »</Quote>}
      <Lead>
        <b>Vous voulez avancer sans attendre ?</b> Démarrez votre dossier en ligne : nous l'aurons sous les yeux pendant l'appel.
      </Lead>
      <Actions primary={{ label: "Démarrer mon bail notarié", href: `${EMAIL_BASE_URL}/commencer` }} />
      <Trust title="Bail notarié en 1 semaine · force exécutoire · +200 clients accompagnés.">
        <br />
        Pressé ? Appelez-nous directement au {PHONE}.
      </Trust>
      <Sign />
    </EmailLayout>
  );
}

MailConfirmation.PreviewProps = {
  firstName: "Thomas",
  lastName: "Bernard",
  email: "thomas.bernard@exemple.fr",
  phone: "06 12 34 56 78",
  message: "Bonjour, je loue un T2 à Paris 11e à partir de janvier et je voudrais un bail notarié. Comment ça se passe ?",
} satisfies MailConfirmationProps;
