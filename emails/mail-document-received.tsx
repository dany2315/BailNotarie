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

interface MailDocumentReceivedProps {
  notaireName?: string | null;
  clientName: string;
  requestTitle: string;
  documentNames: string[];
  bailAddress?: string | null;
  chatUrl: string;
}

export default function MailDocumentReceived({
  notaireName,
  clientName,
  requestTitle,
  documentNames,
  bailAddress,
  chatUrl
}: MailDocumentReceivedProps) {
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
            background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
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
                color: "#166534",
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
                  color: "#166534",
                }}
              >
                BailNotarie
              </span>
            </Link>

            <Text style={{ 
              color: "#166534",
              fontSize: "20px",
              margin: "30px 0px 0px 0px"
            }}>
              Document reçu
            </Text>
          </Section>

          {/* Contenu principal */}
          <Section style={{ paddingTop: "40px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px" }}>
            <Heading style={{ 
              color: "#16a34a",
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              textAlign: "center"
            }}>
              ✅ Nouveau document reçu
            </Heading>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              {notaireName ? `Bonjour ${notaireName},` : "Bonjour,"}
            </Text>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              <strong>{clientName}</strong> a répondu à votre demande de document{bailAddress ? ` concernant le bail situé au ${bailAddress}` : ""}.
            </Text>

            {/* Détails de la demande */}
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
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                📋 Demande : {requestTitle}
              </Text>
              
              <Text style={{ 
                color: "#166534",
                fontSize: "16px",
                fontWeight: "bold",
                margin: "0 0 8px 0"
              }}>
                📎 Document{documentNames.length > 1 ? "s" : ""} reçu{documentNames.length > 1 ? "s" : ""} :
              </Text>
              
              {documentNames.map((name, index) => (
                <Text key={index} style={{ 
                  color: "#374151",
                  fontSize: "14px",
                  margin: "4px 0 4px 16px",
                  backgroundColor: "#ffffff",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb"
                }}>
                  • {name}
                </Text>
              ))}
            </Section>

            {/* CTA principal */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href={chatUrl}
                style={{ 
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  padding: "16px 32px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: "bold",
                  display: "inline-block"
                }}
              >
                Voir le document
              </Button>
            </Section>

            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0 0 32px 0",
              textAlign: "center"
            }}>
              Connectez-vous à votre interface pour consulter et valider le document.
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
              <strong>BailNotarie</strong> - Espace notaire
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
              Vous recevez cet email car un client a répondu à une demande de document.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}





