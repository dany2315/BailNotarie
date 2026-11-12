import { Html, Head, Body, Container, Section, Heading, Text, Button, Hr, Img, Link, Preview } from "@react-email/components";
import * as React from "react";
import { EMAIL_BASE_URL, EMAIL_LOGO_URL } from "./_shared/urls";
import { complementEmailContent, type ComplementEmailInput } from "../lib/utils/complement";

export interface MailComplementProps extends ComplementEmailInput {
  /** Page de la demande dans l'espace client. */
  actionUrl: string;
}

/** Pièces redemandées par l'équipe : la liste, le motif de chacune et le lien vers l'espace client. */
export default function MailComplement(props: MailComplementProps) {
  const content = complementEmailContent(props);
  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
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
            <Heading style={{ color: "#1f2937", fontSize: "22px", fontWeight: "bold", margin: "0 0 6px 0" }}>{content.greeting}</Heading>
            <Text style={{ color: "#6b7280", fontSize: "14px", lineHeight: "20px", margin: "0 0 20px 0" }}>{content.context}</Text>
            <Text style={{ color: "#4b5563", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px 0", whiteSpace: "pre-line" }}>
              {content.message}
            </Text>

            {content.items.map((item, index) => (
              <Section
                key={`${item.label}-${index}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  margin: "0 0 10px 0",
                }}
              >
                <Text style={{ color: "#111827", fontSize: "15px", fontWeight: "bold", lineHeight: "22px", margin: "0" }}>{item.label}</Text>
                <Text style={{ color: "#4b5563", fontSize: "14px", lineHeight: "21px", margin: "4px 0 0 0" }}>{item.detail}</Text>
              </Section>
            ))}

            <Section style={{ textAlign: "center", margin: "28px 0 20px" }}>
              <Button
                href={props.actionUrl}
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
                {content.button}
              </Button>
            </Section>
            <Text style={{ color: "#6b7280", fontSize: "14px", lineHeight: "21px", margin: "0", textAlign: "center" }}>{content.outro}</Text>
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

MailComplement.PreviewProps = {
  name: "Léa Martin",
  address: "12 rue des Lilas, 75011 Paris",
  actionUrl: "https://www.bailnotarie.fr/client/demande/exemple",
  items: [
    { label: "Pièce d'identité de Léa Martin", reason: "ILLEGIBLE", note: "Merci d'envoyer le recto et le verso." },
    { label: "Règlement de copropriété", reason: "MISSING" },
  ],
} satisfies MailComplementProps;
