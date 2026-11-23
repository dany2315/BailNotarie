import * as React from "react";
import { EmailLayout, Title, Lead, CodeBox } from "./_shared/layout";
import { getOtpEmailPreview } from "./_shared/otp";

interface MailClientOTPProps {
  userName?: string | null;
  code: string;
}

/** Code de connexion à l'espace client : un e-mail de sécurité, sobre et reconnaissable. */
export default function MailClientOTP({ userName, code }: MailClientOTPProps) {
  return (
    <EmailLayout preview={getOtpEmailPreview(code)} reference={["Connexion", "à votre espace"]}>
      <Title>Votre code de connexion</Title>
      <Lead>{userName ? `Bonjour ${userName}, saisissez` : "Bonjour, saisissez"} ce code sur la page de connexion pour accéder à votre espace :</Lead>
      <CodeBox code={code} note="Valable 10 minutes" />
      <Lead small>
        Vous n'avez rien demandé ? Ignorez simplement cet e-mail : sans ce code, personne ne peut accéder à votre espace. Ne le communiquez
        jamais, même à notre équipe.
      </Lead>
    </EmailLayout>
  );
}

MailClientOTP.PreviewProps = {
  userName: "Léa Martin",
  code: "482913",
} satisfies MailClientOTPProps;
