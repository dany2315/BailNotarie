import { 
  Html, 
  Head, 
  Body, 
  Container, 
  Section, 
  Heading, 
  Text, 
  Button, 
  Hr,
  Img,
  Link
} from "@react-email/components";
import * as React from "react";
import { EMAIL_BASE_URL, EMAIL_LOGO_URL } from "./_shared/urls";

interface MailTenantFormProps {
  firstName: string;
  lastName: string;
  formUrl: string;
}

export default function MailTenantForm({
  firstName,
  lastName,
  formUrl
}: MailTenantFormProps) {
  return (
    <Html>
      <Head />
      <Body style={{ 
        backgroundColor: "#f8fafc", 
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: 0
      }}>
        <Container style={{ 
          maxWidth: "600px", 
          margin: "0 auto", 
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
          {/* Header avec logo */}
          <Section style={{ 
            background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)",
            paddingTop: "32px",
            paddingBottom: "32px",
            paddingLeft: "24px",
            paddingRight: "24px",
            textAlign: "start"
          }}>
            <Link
              href={EMAIL_BASE_URL}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "start",
                textDecoration: "none",
                color: "#1e3a8a",
              }}
            >
              <Img
                src={EMAIL_LOGO_URL}
                alt="BailNotarie - Plateforme de baux notariés"
                width="40"
                height="40"
                style={{
                  borderRadius: "50%",
                  display: "block",
                }}
              />
              <span
                style={{
                  marginLeft: "8px",
                  marginTop: "5px",
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1e3a8a",
                }}
              >
                BailNotarie
              </span>
            </Link>

            <Text style={{ 
              color: "#1e3a8a",
              fontSize: "20px",
              margin: "30px 0px 0px 0px "
            }}>
              Votre partenaire pour les baux notariés sécurisés
            </Text>
          </Section>

          {/* Contenu principal */}
          <Section style={{ paddingTop: "40px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px" }}>
            <Heading style={{ 
              color: "#1f2937",
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 0 20px 0"
            }}>
              Bonjour {firstName} {lastName},
            </Heading>

            <Text style={{ 
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: "24px",
              margin: "0 0 20px 0"
            }}>
              Votre propriétaire a initié la création d'un bail notarié pour le bien que vous allez louer. 
              Pour finaliser cette procédure, nous avons besoin que vous complétiez le formulaire 
              avec vos informations personnelles complètes.
            </Text>

            <Text style={{ 
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: "24px",
              margin: "0 0 20px 0"
            }}>
              Ce formulaire vous permettra de renseigner :
            </Text>

            <ul style={{ 
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: "24px",
              margin: "0 0 20px 0",
              paddingLeft: "20px"
            }}>
              <li>Vos informations personnelles complètes</li>
              <li>Votre situation familiale</li>
              <li>Vos coordonnées détaillées</li>
              <li>Toutes les informations nécessaires pour le bail</li>
            </ul>

            <Section style={{ 
              textAlign: "center",
              margin: "32px 0"
            }}>
              <Button
                href={formUrl}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "14px 28px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  display: "inline-block",
                  fontSize: "16px",
                  fontWeight: "600"
                }}
              >
                Accéder au formulaire
              </Button>
            </Section>
          </Section>

          <Hr style={{ 
            borderColor: "#e5e7eb",
            margin: "0"
          }} />

          {/* Footer */}
          <Section style={{ 
            paddingTop: "24px",
            paddingBottom: "24px",
            paddingLeft: "24px",
            paddingRight: "24px",
            textAlign: "center",
            backgroundColor: "#f9fafb"
          }}>
            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              margin: "0 0 8px 0"
            }}>
              <strong>BailNotarie</strong> - Votre partenaire pour les baux notariés
            </Text>
            <Text style={{ 
              color: "#6b7280",
              fontSize: "12px",
              margin: "0 0 8px 0"
            }}>
              <Link href="tel:+33749387756" style={{ color: "#6b7280", textDecoration: "none" }}>📞 07 49 38 77 56</Link> | <Link href={EMAIL_BASE_URL} style={{ color: "#6b7280", textDecoration: "none" }}>🌐 www.bailnotarie.fr</Link>
            </Text>
            <Text style={{ 
              color: "#9ca3af",
              fontSize: "12px",
              margin: 0
            }}>
              Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}







