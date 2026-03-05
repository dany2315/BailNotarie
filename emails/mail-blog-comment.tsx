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

interface MailBlogCommentProps {
  commenterName: string;
  commenterEmail: string;
  commentContent: string;
  articleTitle: string;
  articleUrl: string;
  commentDate: string;
}

export default function MailBlogComment({
  commenterName,
  commenterEmail,
  commentContent,
  articleTitle,
  articleUrl,
  commentDate
}: MailBlogCommentProps) {
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
              margin: "30px 0px 0px 0px"
            }}>
              Votre partenaire pour les baux notariés sécurisés
            </Text>
          </Section>

          {/* Contenu principal */}
          <Section style={{ paddingTop: "40px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px" }}>
            <Heading style={{ 
              color: "#dc2626",
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              textAlign: "center"
            }}>
              💬 Nouveau commentaire sur le blog
            </Heading>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0"
            }}>
              Un nouveau commentaire a été publié sur l'un de vos articles de blog.
            </Text>

            {/* Informations de l'article */}
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
                📝 Article :
              </Text>
              
              <Text style={{ 
                color: "#374151",
                fontSize: "16px",
                fontWeight: "bold",
                margin: "0 0 8px 0"
              }}>
                {articleTitle}
              </Text>
              
              <Button
                href={articleUrl}
                style={{ 
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "bold",
                  display: "inline-block",
                  marginTop: "8px"
                }}
              >
                Voir l'article
              </Button>
            </Section>

            {/* Informations du commentateur */}
            <Section style={{ 
              backgroundColor: "#fef2f2",
              borderRadius: "8px",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "24px",
              paddingRight: "24px",
              margin: "24px 0",
              border: "2px solid #fecaca"
            }}>
              <Text style={{ 
                color: "#991b1b",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                👤 Informations du commentateur :
              </Text>
              
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                <strong>Nom :</strong> {commenterName}
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                <strong>Email :</strong> <Link href={`mailto:${commenterEmail}`} style={{ color: "#2563eb", textDecoration: "none" }}>{commenterEmail}</Link>
              </Text>
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 16px 0"
              }}>
                <strong>Date du commentaire :</strong> {commentDate}
              </Text>
              
              <Text style={{ 
                color: "#374151",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 8px 0"
              }}>
                <strong>Commentaire :</strong>
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
                border: "1px solid #e5e7eb",
                whiteSpace: "pre-wrap"
              }}>
                "{commentContent}"
              </Text>
            </Section>

            {/* Bouton d'action */}
            <Section style={{ textAlign: "center", margin: "32px 0", paddingLeft: "24px", paddingRight: "24px" }}>
              <Button
                href={articleUrl}
                style={{ 
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "bold",
                  display: "inline-block"
                }}
              >
                📖 Voir le commentaire sur l'article
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
              <strong>BailNotarie</strong> - Système de notification automatique
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
              Cette notification a été générée automatiquement suite à un nouveau commentaire sur le blog.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

