import { Html, Head, Body, Container, Section, Heading, Text, Button, Hr, Img, Link, Preview } from "@react-email/components";
import * as React from "react";
import { EMAIL_BASE_URL, EMAIL_LOGO_URL } from "./_shared/urls";

export interface MailTenantReconfirmationProps {
  /** Nom après « Bonjour » ; vide si inconnu. */
  name: string;
  /** Adresse du logement ou du local. */
  address: string;
  /** Libellés des conditions modifiées (« Loyer », « Charges »…). */
  changedLabels: string[];
  /** Page du dossier dans l'espace locataire. */
  actionUrl: string;
}

export const tenantReconfirmationSubject = "Les conditions de votre bail ont changé : merci de les confirmer";

/**
 * Un seul message, envoyé quand le propriétaire ou l'équipe modifie des conditions que le locataire avait
 * déjà acceptées. Pas de relance automatique (décision de l'utilisateur du 17/11/2026, M15).
 */
export default function MailTenantReconfirmation({ name, address, changedLabels, actionUrl }: MailTenantReconfirmationProps) {
  const changed = changedLabels.length > 0 ? changedLabels.join(", ").toLowerCase() : "certaines conditions";
  return (
    <Html>
      <Head />
      <Preview>Votre confirmation est de nouveau nécessaire pour le bail du {address}.</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Section style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", padding: "32px 24px", textAlign: "start" }}>
            <Link href={EMAIL_BASE_URL} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#1e3a8a" }}>
              <Img src={EMAIL_LOGO_URL} alt="BailNotarie" width="40" height="40" style={{ borderRadius: "50%", display: "block" }} />
              <span style={{ marginLeft: "8px", marginTop: "5px", fontSize: "24px", fontWeight: "bold", color: "#1e3a8a" }}>BailNotarie</span>
            </Link>
          </Section>

          <Section style={{ padding: "40px 24px 32px" }}>
            <Heading style={{ color: "#1f2937", fontSize: "22px", fontWeight: "bold", margin: "0 0 6px 0" }}>
              {name ? `Bonjour ${name},` : "Bonjour,"}
            </Heading>
            <Text style={{ color: "#6b7280", fontSize: "14px", lineHeight: "20px", margin: "0 0 20px 0" }}>Bail du {address}</Text>
            <Text style={{ color: "#4b5563", fontSize: "16px", lineHeight: "24px", margin: "0 0 16px 0" }}>
              Vous aviez confirmé les conditions de votre bail. Depuis, les éléments suivants ont été modifiés : {changed}.
            </Text>
            <Text style={{ color: "#4b5563", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px 0" }}>
              Votre accord ne vaut que pour les conditions que vous avez vues : merci de relire les nouvelles conditions dans
              votre espace et de les confirmer. Le notaire voit que votre nouvelle confirmation est attendue.
            </Text>

            <Section style={{ textAlign: "center", margin: "28px 0 20px" }}>
              <Button
                href={actionUrl}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "14px 28px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  display: "inline-block",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                Relire et confirmer
              </Button>
            </Section>
            <Text style={{ color: "#6b7280", fontSize: "14px", lineHeight: "21px", margin: "0", textAlign: "center" }}>
              Une question ou un désaccord ? Écrivez-nous depuis votre espace, nous vous répondrons rapidement.
            </Text>
          </Section>

          <Hr style={{ borderColor: "#e5e7eb", margin: "0" }} />
          <Section style={{ padding: "24px", textAlign: "center", backgroundColor: "#f9fafb" }}>
            <Text style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 8px 0" }}>
              <strong>BailNotarie</strong> - Votre partenaire pour les baux notariés
            </Text>
            <Text style={{ color: "#6b7280", fontSize: "12px", margin: "0 0 8px 0" }}>
              <Link href="tel:+33768098624" style={{ color: "#6b7280", textDecoration: "none" }}>
                📞 07 68 09 86 24
              </Link>{" "}
              |{" "}
              <Link href={EMAIL_BASE_URL} style={{ color: "#6b7280", textDecoration: "none" }}>
                🌐 www.bailnotarie.fr
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

MailTenantReconfirmation.PreviewProps = {
  name: "Léa Martin",
  address: "12 rue des Lilas, 75011 Paris",
  changedLabels: ["Loyer", "Charges"],
  actionUrl: "https://www.bailnotarie.fr/client/locataire/baux/exemple",
} satisfies MailTenantReconfirmationProps;
