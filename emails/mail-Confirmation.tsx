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

interface MailConfirmationProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export default function MailConfirmation({
  firstName,
  lastName,
  email,
  phone,
  message
}: MailConfirmationProps) {
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
                color: "#1e3a8a", // text-blue-900 par ex
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
              margin: "0 0 16px 0",
              textAlign: "center"
            }}>
              Demande reçue avec succès !
            </Heading>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              Bonjour {firstName} {lastName},
            </Text>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              Nous avons bien reçu votre demande de bail notarié. Notre équipe d'experts va l'étudier avec attention et vous recontacter dans les plus brefs délais.
            </Text>

            {/* Récapitulatif de la demande */}
            <Section style={{ 
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              padding: "24px",
              margin: "24px 0"
            }}>
              <Text style={{ 
                color: "#1f2937",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                📋 Récapitulatif de votre demande :
              </Text>
              
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                <strong>Nom complet :</strong> {firstName} {lastName}
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                <strong>Email :</strong> {email}
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                <strong>Téléphone :</strong> {phone}
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 16px 0"
              }}>
                <strong>Message :</strong>
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 16px 0",
                fontStyle: "italic",
                backgroundColor: "#ffffff",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb"
              }}>
                "{message}"
              </Text>
            </Section>

            {/* Points clés */}
            <Section style={{ 
              backgroundColor: "#f0f9ff",
              borderRadius: "8px",
              padding: "24px",
              margin: "24px 0"
            }}>
              <Text style={{ 
                color: "#1f2937",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                ⚡ Ce qui vous attend :
              </Text>
              
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                • <strong>Devis gratuit</strong> sous 24h
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                • <strong>Bail notarié</strong> en 48h
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                • <strong>Force exécutoire</strong> immédiate
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: 0
              }}>
                • <strong>+2000 clients</strong> satisfaits
              </Text>
            </Section>

            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 32px 0"
            }}>
              En attendant notre retour, n'hésitez pas à nous contacter directement au <strong>07 49 38 77 56</strong> pour toute question urgente.
            </Text>

            {/* CTA principal */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href="https://www.bailnotarie.fr"
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
                Retour à la page d'accueil
              </Button>
            </Section>
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
              <strong>BailNotarie</strong> - Expert en bail notarié depuis 2019
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