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

interface MailNotificationEquipeProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  dateDemande: string;
}

export default function MailNotificationEquipe({
  firstName,
  lastName,
  email,
  phone,
  message,
  dateDemande
}: MailNotificationEquipeProps) {
  return (
    <Html>
      <Head>
        <style>{`
            @media only screen and (min-width: 600px) {
            .btn-desktop {
                margin-right: 12px !important;
            }
            }
        `}</style>
      </Head>
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
            padding: "32px 24px",
            textAlign: "start"
          }}>
            <Link
              href="https://bailnotarie.fr"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "start",
                textDecoration: "none",
                color: "#1e3a8a",
              }}
            >
              <Img
                src="https://bailnotarie.fr/logoSans.png"
                alt="BailNotarie"
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
          <Section style={{ padding: "40px 24px" }}>
            <Heading style={{ 
              color: "#dc2626",
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              textAlign: "center"
            }}>
              🆕 Nouvelle demande reçue !
            </Heading>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              Une nouvelle personne s'est intéressée à nos services de bail notarié.
            </Text>

            {/* Informations du prospect */}
            <Section style={{ 
              backgroundColor: "#fef2f2",
              borderRadius: "8px",
              padding: "24px",
              margin: "24px 0",
              border: "2px solid #fecaca"
            }}>
              <Text style={{ 
                color: "#991b1b",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                👤 Informations du prospect :
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
                <strong>Email :</strong> <Link href={`mailto:${email}`} style={{ color: "#2563eb", textDecoration: "none" }}>{email}</Link>
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                <strong>Téléphone :</strong> <Link href={`tel:${phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>{phone}</Link>
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 16px 0"
              }}>
                <strong>Date de demande :</strong> {dateDemande}
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

            {/* Actions à effectuer */}
            <Section style={{ 
              backgroundColor: "#f0f9ff",
              borderRadius: "8px",
              padding: "24px",
              margin: "24px 0"
            }}>
              <Text style={{ 
                color: "#1e40af",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                📋 Actions recommandées :
              </Text>
              
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                1️⃣ <strong>Contacter le prospect</strong> sous 24h maximum
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                2️⃣ <strong>Établir un devis</strong> personnalisé
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                3️⃣ <strong>Expliquer le processus</strong> de bail notarié
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: 0
              }}>
                4️⃣ <strong>Suivre le dossier</strong> jusqu'à la signature
              </Text>
            </Section>

            {/* Boutons d'action rapide */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href={`mailto:${email}?subject=Demande de bail notarié - BailNotarie&body=Bonjour ${firstName} ${lastName},%0D%0A%0D%0ANous avons bien reçu votre demande et nous vous remercions de l'intérêt que vous portez à nos services.%0D%0A%0D%0ANotre équipe va étudier votre projet et vous recontacter dans les plus brefs délais.%0D%0A%0D%0ACordialement,%0D%0AL'équipe BailNotarie`}
                className="btn-desktop"
                style={{ 
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "bold",
                  display: "inline-block",
                  marginRight: "0",
                }}
              >
                📧  Répondre par email
              </Button>
              
              <Button
                href={`tel:${phone}`}
                style={{ 
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  marginTop:"10px",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "bold",
                  display: "inline-block"
                }}
              >
                📞 Appeler directement
              </Button>
            </Section>

            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0 0 32px 0",
              textAlign: "center"
            }}>
              <strong>Priorité :</strong> Ce prospect a manifesté un intérêt actif. Une réponse rapide augmente significativement les chances de conversion.
            </Text>
          </Section>

          <Hr style={{ 
            border: "none",
            borderTop: "1px solid #e5e7eb",
            margin: "0"
          }} />

          {/* Footer */}
          <Section style={{ 
            padding: "24px",
            textAlign: "center",
            backgroundColor: "#f9fafb"
          }}>
            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              margin: "0 0 8px 0"
            }}>
              <strong>BailNotarie</strong> - Système de notification automatique
            </Text>
            <Text style={{ 
              color: "#6b7280",
              fontSize: "12px",
              margin: "0 0 8px 0"
            }}>
              <Link href="tel:+33749387756" style={{ color: "#6b7280", textDecoration: "none" }}>📞 07 49 38 77 56</Link> | <Link href="https://bailnotarie.fr" style={{ color: "#6b7280", textDecoration: "none" }}>🌐 bailnotarie.fr</Link>
            </Text>
            <Text style={{ 
              color: "#9ca3af",
              fontSize: "12px",
              margin: 0
            }}>
              Cette notification a été générée automatiquement suite à une nouvelle demande sur le site.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
