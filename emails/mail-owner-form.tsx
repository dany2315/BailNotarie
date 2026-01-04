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

interface MailOwnerFormProps {
  firstName: string;
  lastName: string;
  formUrl: string;
  emailContext?: "landing_owner" | "landing_tenant" | "admin" | "default";
}

export default function MailOwnerForm({
  firstName,
  lastName,
  formUrl,
  emailContext = "default"
}: MailOwnerFormProps) {
  // Contenu adapté selon le contexte
  const getContent = () => {
    switch (emailContext) {
      case "landing_owner":
        return {
          title: `Bonjour ${firstName} ${lastName},`,
          intro: "Nous vous remercions de votre confiance et de l'intérêt que vous portez à nos services de bail notarié.",
          mainText: "Pour finaliser votre demande, nous avons besoin que vous complétiez le formulaire avec vos informations personnelles et les détails du bien que vous souhaitez mettre en location.",
          additionalText: "Vous pouvez compléter ce formulaire maintenant ou y revenir plus tard en utilisant le lien ci-dessous. Votre progression sera sauvegardée.",
          buttonText: "Accéder au formulaire",
          showList: false
        };
      case "landing_tenant":
        return {
          title: `Bonjour ${firstName} ${lastName},`,
          intro: "Un locataire a initié une demande de bail notarié et vous a indiqué comme propriétaire.",
          mainText: "Pour poursuivre le processus, nous avons besoin que vous complétiez le formulaire ci-dessous avec vos informations personnelles et les détails du bien concerné.",
          additionalText: "Ce formulaire vous permettra de renseigner toutes les informations nécessaires à la création du bail notarié.",
          buttonText: "Compléter le formulaire",
          showList: false
        };
      case "admin":
        return {
          title: `Bonjour ${firstName} ${lastName},`,
          intro: "Un formulaire de bail notarié vous a été assigné par notre équipe.",
          mainText: "Nous vous invitons à compléter le formulaire ci-dessous avec vos informations personnelles et les détails du bien que vous souhaitez mettre en location.",
          additionalText: "Ce formulaire vous permettra de renseigner toutes les informations nécessaires à la création du bail notarié.",
          buttonText: "Accéder au formulaire",
          showList: true
        };
      default:
        return {
          title: `Bonjour ${firstName} ${lastName},`,
          intro: "Nous vous remercions de votre confiance. Pour finaliser la création de votre bail notarié, nous avons besoin que vous complétiez le formulaire ci-dessous avec vos informations personnelles et les détails du bien que vous souhaitez mettre en location.",
          mainText: "",
          additionalText: "",
          buttonText: "Accéder au formulaire",
          showList: false
        };
    }
  };

  const content = getContent();
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
              {content.title}
            </Heading>

            <Text style={{ 
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: "24px",
              margin: "0 0 20px 0"
            }}>
              {content.intro}
            </Text>

            {content.mainText && (
              <Text style={{ 
                color: "#4b5563",
                fontSize: "16px",
                lineHeight: "24px",
                margin: "0 0 20px 0"
              }}>
                {content.mainText}
              </Text>
            )}

            {content.showList && (
              <>
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
                  <li>Les caractéristiques du bien à louer</li>
                  <li>Les conditions du bail (loyer, charges, etc.)</li>
                  <li>Les informations du locataire</li>
                </ul>
              </>
            )}

            {content.additionalText && (
              <Text style={{ 
                color: "#4b5563",
                fontSize: "16px",
                lineHeight: "24px",
                margin: "0 0 20px 0"
              }}>
                {content.additionalText}
              </Text>
            )}

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
                {content.buttonText}
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







