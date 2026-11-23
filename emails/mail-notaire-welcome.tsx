import * as React from "react";
import { EmailLayout, Title, Lead, NumberedList, Actions, Hint, Sign, PHONE } from "./_shared/layout";

interface MailNotaireWelcomeProps {
  userName?: string | null;
  email: string;
  loginUrl: string;
}

/** Compte notaire créé par l'équipe. */
export default function MailNotaireWelcome({ email, loginUrl }: MailNotaireWelcomeProps) {
  return (
    <EmailLayout preview="Des dossiers de bail déjà vérifiés, pièces classées et échanges centralisés." reference={["Espace notaire"]}>
      <Title>Votre espace notaire est ouvert</Title>
      <Lead>
        Maître, nous sommes heureux de vous compter parmi nos notaires partenaires. Votre espace réunit tout ce qu'il faut pour préparer les baux
        que nous vous confions :
      </Lead>
      <NumberedList
        items={[
          {
            title: "Des dossiers déjà vérifiés.",
            text: "Identité, bien, conditions du bail et pièces sont contrôlés par notre équipe avant de vous être transmis.",
          },
          { title: "Les pièces classées par partie.", text: "Plus besoin de les chercher dans vos e-mails." },
          {
            title: "Les échanges au même endroit.",
            text: "Demandez un document ou écrivez aux parties depuis le dossier, nous relançons pour vous.",
          },
        ]}
      />
      <Actions primary={{ label: "Ouvrir mon espace notaire", href: loginUrl }} />
      <Hint>Connexion sans mot de passe : saisissez {email}, vous recevez un code par e-mail.</Hint>
      <Sign closing="Bien cordialement," help={`Votre contact : ${PHONE}`} />
    </EmailLayout>
  );
}

MailNotaireWelcome.PreviewProps = {
  userName: "Claire Durand",
  email: "c.durand@etude-durand.fr",
  loginUrl: "https://www.bailnotarie.fr/notaire/login",
} satisfies MailNotaireWelcomeProps;
