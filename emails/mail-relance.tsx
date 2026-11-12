import { Html, Head, Body, Container, Section, Heading, Text, Button, Hr, Img, Link, Preview } from "@react-email/components";
import * as React from "react";
import { EMAIL_BASE_URL, EMAIL_LOGO_URL } from "./_shared/urls";

import { relanceEmailContent, type RelanceEmailInput, type RelanceReason } from "../lib/utils/relance-content";

export type { RelanceReason };
export type MailRelanceProps = RelanceEmailInput;

export default function MailRelance(props: MailRelanceProps) {
  const content = relanceEmailContent(props);
  const outro = content.outro;
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
          <Section
            style={{
              background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)",
              padding: "32px 24px",
              textAlign: "start",
            }}
          >
            <Link href={EMAIL_BASE_URL} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#1e3a8a" }}>
              <Img src={EMAIL_LOGO_URL} alt="BailNotarie" width="40" height="40" style={{ borderRadius: "50%", display: "block" }} />
              <span style={{ marginLeft: "8px", marginTop: "5px", fontSize: "24px", fontWeight: "bold", color: "#1e3a8a" }}>BailNotarie</span>
            </Link>
          </Section>

          <Section style={{ padding: "40px 24px" }}>
            <Heading style={{ color: "#1f2937", fontSize: "22px", fontWeight: "bold", margin: "0 0 20px 0" }}>
              Bonjour{props.name ? ` ${props.name}` : ""},
            </Heading>
            {content.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={{ color: "#4b5563", fontSize: "16px", lineHeight: "24px", margin: "0 0 16px 0" }}>
                {paragraph}
              </Text>
            ))}
            {props.items && props.items.length > 0 && (
              <ul style={{ color: "#1f2937", fontSize: "16px", lineHeight: "26px", margin: "0 0 20px 0", paddingLeft: "20px" }}>
                {props.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {outro && <Text style={{ color: "#4b5563", fontSize: "16px", lineHeight: "24px", margin: "0 0 16px 0" }}>{outro}</Text>}
            {props.note && (
              <Text
                style={{
                  color: "#1f2937",
                  fontSize: "15px",
                  lineHeight: "22px",
                  margin: "0 0 16px 0",
                  padding: "12px 16px",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "8px",
                  whiteSpace: "pre-line",
                }}
              >
                {props.note}
              </Text>
            )}
            <Section style={{ textAlign: "center", margin: "32px 0 8px" }}>
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

MailRelance.PreviewProps = {
  reason: "TENANT_FORM",
  name: "Léa Martin",
  address: "12 rue des Lilas, 75011 Paris",
  actionUrl: "https://www.bailnotarie.fr/intakes/exemple",
} satisfies MailRelanceProps;
