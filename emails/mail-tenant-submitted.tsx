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

interface MailTenantSubmittedProps {
  ownerFirstName: string;
  ownerLastName: string;
  tenantFirstName: string;
  tenantLastName: string;
  propertyAddress?: string;
  interfaceUrl: string;
}

export default function MailTenantSubmitted({
  ownerFirstName,
  ownerLastName,
  tenantFirstName,
  tenantLastName,
  propertyAddress,
  interfaceUrl
}: MailTenantSubmittedProps) {
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
              href="https://www.bailnotarie.fr"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "start",
                textDecoration: "none",
                color: "#1e3a8a",
              }}
            >
              <Img
                src="https://www.bailnotarie.fr/logoSans.png"
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
              Bonjour {ownerFirstName} {ownerLastName},
            </Heading>

            <Text style={{ 
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: "24px",
              margin: "0 0 20px 0"
            }}>
              Bonne nouvelle ! Votre locataire <strong>{tenantFirstName} {tenantLastName}</strong> a complété et soumis son formulaire de bail notarié.
            </Text>

            {propertyAddress && (
              <Section style={{
                backgroundColor: "#f0fdf4",
                borderRadius: "8px",
                padding: "16px",
                margin: "0 0 20px 0",
                borderLeft: "4px solid #22c55e"
              }}>
                <Text style={{ 
                  color: "#166534",
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 4px 0"
                }}>
                  Bien concerné :
                </Text>
                <Text style={{ 
                  color: "#15803d",
                  fontSize: "16px",
                  margin: 0
                }}>
                  {propertyAddress}
                </Text>
              </Section>
            )}
            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "20px",
              margin: "20px 0 0 0",
              fontStyle: "italic"
            }}>
              Notre équipe vérifie les informations et vous tiendra informé des prochaines étapes.
            </Text>
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
              <Link href="tel:+33749387756" style={{ color: "#6b7280", textDecoration: "none" }}>📞 07 49 38 77 56</Link> | <Link href="https://www.bailnotarie.fr" style={{ color: "#6b7280", textDecoration: "none" }}>🌐 www.bailnotarie.fr</Link>
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









