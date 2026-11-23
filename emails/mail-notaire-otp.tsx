import * as React from "react";
import { EmailLayout, Title, Lead, CodeBox } from "./_shared/layout";
import { getOtpEmailPreview } from "./_shared/otp";

interface MailNotaireOTPProps {
  userName?: string | null;
  code: string;
}

/** Code de connexion à l'espace notaire. */
export default function MailNotaireOTP({ code }: MailNotaireOTPProps) {
  return (
    <EmailLayout preview={getOtpEmailPreview(code)} reference={["Espace notaire", "Connexion"]}>
      <Title>Votre code de connexion</Title>
      <Lead>Maître, saisissez ce code pour accéder à votre espace notaire :</Lead>
      <CodeBox code={code} note="Valable 10 minutes" />
      <Lead small>Vous n'avez rien demandé ? Ignorez cet e-mail : sans ce code, personne ne peut accéder à vos dossiers.</Lead>
    </EmailLayout>
  );
}

MailNotaireOTP.PreviewProps = {
  userName: "Claire Durand",
  code: "482913",
} satisfies MailNotaireOTPProps;
