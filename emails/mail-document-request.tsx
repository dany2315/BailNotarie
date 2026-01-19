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

interface MailDocumentRequestProps {
  recipientName?: string | null;
  notaireName: string;
  requestTitle: string;
  requestContent: string;
  bailAddress?: string | null;
  chatUrl: string;
}

export default function MailDocumentRequest({
  recipientName,
  notaireName,
  requestTitle,
  requestContent,
  bailAddress,
  chatUrl
}: MailDocumentRequestProps) {
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
            background: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)",
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
                color: "#92400e",
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
                  color: "#92400e",
                }}
              >
                BailNotarie
              </span>
            </Link>

            <Text style={{ 
              color: "#92400e",
              fontSize: "20px",
              margin: "30px 0px 0px 0px"
            }}>
              Nouvelle demande de document
            </Text>
          </Section>

          {/* Contenu principal */}
          <Section style={{ paddingTop: "40px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px" }}>
            <Heading style={{ 
              color: "#ea580c",
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              textAlign: "center"
            }}>
              📄 Demande de document
            </Heading>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              {recipientName ? `Bonjour ${recipientName},` : "Bonjour,"}
            </Text>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              <strong>{notaireName}</strong> (votre notaire) vous a envoyé une demande de document{bailAddress ? ` concernant le bail situé au ${bailAddress}` : ""}.
            </Text>

            {/* Détails de la demande */}
            <Section style={{ 
              backgroundColor: "#fffbeb",
              borderRadius: "8px",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "24px",
              paddingRight: "24px",
              margin: "24px 0",
              border: "2px solid #fcd34d"
            }}>
              <Text style={{ 
                color: "#92400e",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 8px 0"
              }}>
                {requestTitle}
              </Text>
              
              <Text style={{ 
                color: "#374151",
                fontSize: "16px",
                lineHeight: "1.6",
                margin: "0",
                backgroundColor: "#ffffff",
                padding: "16px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb"
              }}>
                {requestContent}
              </Text>
            </Section>

            {/* CTA principal */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Text style={{ 
                color: "#374151",
                fontSize: "16px",
                lineHeight: "1.6",
                margin: "0 0 16px 0"
              }}>
                Connectez-vous à votre espace pour envoyer le document demandé :
              </Text>
              <Button
                href={chatUrl}
                style={{ 
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  padding: "16px 32px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: "bold",
                  display: "inline-block"
                }}
              >
                Envoyer le document
              </Button>
            </Section>

            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0 0 32px 0",
              textAlign: "center"
            }}>
              Merci de répondre à cette demande dans les meilleurs délais.
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
              <strong>BailNotarie</strong> - Votre espace sécurisé
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
              Vous recevez cet email car votre notaire vous a fait une demande de document pour votre dossier de bail.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}






