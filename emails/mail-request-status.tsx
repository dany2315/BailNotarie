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

interface MailRequestStatusProps {
  firstName?: string | null;
  lastName?: string | null;
  currentStep: string;
  status: string;
  propertyAddress?: string | null;
  profilType: string;
  intakeLinkToken?: string | null;
}

export default function MailRequestStatus({
  firstName,
  lastName,
  currentStep,
  status,
  propertyAddress,
  profilType,
  intakeLinkToken,
}: MailRequestStatusProps) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://www.bailnotarie.fr";
  const formUrl = intakeLinkToken ? `${baseUrl}/intakes/${intakeLinkToken}` : null;

  const getStatusIcon = () => {
    if (status === "SUBMITTED") {
      return "✅";
    } else if (status === "PENDING") {
      return "⏳";
    }
    return "📋";
  };

  const getStatusColor = () => {
    if (status === "SUBMITTED") {
      return "#10b981"; // green
    } else if (status === "PENDING") {
      return "#f59e0b"; // yellow
    }
    return "#6b7280"; // gray
  };

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
              margin: "30px 0px 0px 0px"
            }}>
              Votre partenaire pour les baux notariés sécurisés
            </Text>
          </Section>

          {/* Contenu principal */}
          <Section style={{ paddingTop: "40px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px" }}>
            <Heading style={{ 
              color: "#2563eb",
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              textAlign: "center"
            }}>
              📊 Suivi de votre demande
            </Heading>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              {firstName && lastName ? `Bonjour ${firstName} ${lastName},` : "Bonjour,"}
            </Text>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              Vous avez demandé à connaître l'état d'avancement de votre demande de bail notarié. Voici les informations concernant votre dossier :
            </Text>

            {/* Détails du statut */}
            <Section style={{ 
              backgroundColor: "#f0f9ff",
              borderRadius: "8px",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "24px",
              paddingRight: "24px",
              margin: "24px 0",
              border: "2px solid #bfdbfe"
            }}>
              <Text style={{ 
                color: "#1e40af",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                {getStatusIcon()} État actuel :
              </Text>
              
              <Text style={{ 
                color: getStatusColor(),
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0",
                backgroundColor: "#ffffff",
                padding: "16px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb"
              }}>
                {currentStep}
              </Text>

              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                margin: "16px 0 0 0"
              }}>
                <strong>Type de profil :</strong> {profilType === "PROPRIETAIRE" ? "Propriétaire" : "Locataire"}
              </Text>

              {propertyAddress && (
                <Text style={{ 
                  color: "#374151",
                  fontSize: "14px",
                  margin: "8px 0 0 0"
                }}>
                  <strong>Bien concerné :</strong> {propertyAddress}
                </Text>
              )}
            </Section>

            {/* CTA si formulaire en cours */}
            {formUrl && status === "PENDING" && (
              <Section style={{ textAlign: "center", margin: "32px 0" }}>
                <Text style={{ 
                  color: "#374151",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: "0 0 16px 0"
                }}>
                  Votre formulaire est en cours de complétion. Vous pouvez le continuer en cliquant sur le bouton ci-dessous :
                </Text>
                <Button
                  href={formUrl}
                  style={{ 
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "16px 32px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "16px",
                    fontWeight: "bold",
                    display: "inline-block"
                  }}
                >
                  Continuer mon formulaire
                </Button>
              </Section>
            )}

            {status === "SUBMITTED" && (
              <Section style={{ 
                backgroundColor: "#f0fdf4",
                borderRadius: "8px",
                paddingTop: "24px",
                paddingBottom: "24px",
                paddingLeft: "24px",
                paddingRight: "24px",
                margin: "24px 0",
                border: "2px solid #86efac"
              }}>
                <Text style={{ 
                  color: "#166534",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: "0"
                }}>
                  ✅ Votre formulaire a été soumis avec succès. Notre équipe va maintenant examiner votre dossier et vous contactera prochainement.
                </Text>
              </Section>
            )}

            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "32px 0 0 0",
              textAlign: "center"
            }}>
              Si vous avez des questions ou besoin d'assistance, n'hésitez pas à nous contacter.
            </Text>
          </Section>

          <Hr style={{ 
            border: "none",
            borderTop: "1px solid #e5e7eb",
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
              <strong>BailNotarie</strong> - Suivi de demande automatique
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
              Cet email a été généré automatiquement suite à votre demande de suivi. Pour des raisons de sécurité, les informations détaillées ne sont disponibles que par email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}



