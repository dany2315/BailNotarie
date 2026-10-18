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

interface MailLeadConversionProps {
  convertUrl: string;
  isOwnerForm?: boolean;
  isTenantForm?: boolean;
}

export default function MailLeadConversion({
  convertUrl,
  isOwnerForm = false,
  isTenantForm = false,
}: MailLeadConversionProps) {
  // Si c'est un formulaire (propriétaire ou locataire), afficher le message de formulaire
  if (isOwnerForm || isTenantForm) {
    const role = isOwnerForm ? "propriétaire" : "locataire";
    return (
      <Html>
        <Head />
        <Body style={{ 
          backgroundColor: "#f8fafc", 
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: "20px"
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
                Bonjour,
              </Heading>

              <Text style={{ 
                color: "#4b5563",
                fontSize: "16px",
                lineHeight: "24px",
                margin: "0 0 20px 0"
              }}>
                Vous avez été identifié comme {role}. Pour finaliser la création de votre bail notarié, 
                nous avons besoin que vous complétiez le formulaire ci-dessous avec vos informations personnelles.
              </Text>

              {isOwnerForm && (
                <Text style={{ 
                  color: "#4b5563",
                  fontSize: "16px",
                  lineHeight: "24px",
                  margin: "0 0 20px 0"
                }}>
                  Ce formulaire vous permettra de renseigner :
                </Text>
              )}

              {isOwnerForm && (
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
              )}

              {isTenantForm && (
                <Text style={{ 
                  color: "#4b5563",
                  fontSize: "16px",
                  lineHeight: "24px",
                  margin: "0 0 20px 0"
                }}>
                  Ce formulaire vous permettra de renseigner vos informations personnelles complètes en tant que locataire.
                </Text>
              )}

              <Section style={{ 
                textAlign: "center",
                margin: "32px 0"
              }}>
                <Button
                  href={convertUrl}
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
              padding: "24px",
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
                <Link href="tel:+33768098624" style={{ color: "#6b7280", textDecoration: "none" }}>📞 07 68 09 86 24</Link> | <Link href={EMAIL_BASE_URL} style={{ color: "#6b7280", textDecoration: "none" }}>🌐 www.bailnotarie.fr</Link>
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

  // Sinon, c'est l'email de conversion initial
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
              Bienvenue chez BailNotarie !
            </Heading>

            <Text style={{ 
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: "24px",
              margin: "0 0 20px 0"
            }}>
              Nous sommes ravis de vous accueillir ! Vous avez été recommandé pour bénéficier de notre service 
              de <strong>bail notarié</strong>, une solution moderne et sécurisée pour vos locations.
            </Text>

            {/* Section avantages du bail notarié */}
            <Section style={{ 
              backgroundColor: "#f0f9ff",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "24px",
              paddingRight: "24px",
              borderRadius: "8px",
              margin: "24px 0"
            }}>
              <Heading style={{ 
                color: "#1e40af",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0"
              }}>
                Pourquoi choisir un bail notarié ?
              </Heading>
              
              <ul style={{ 
                color: "#1e40af",
                fontSize: "15px",
                lineHeight: "22px",
                margin: "0",
                paddingLeft: "20px"
              }}>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Sécurité renforcée</strong> : Protection juridique maximale pour propriétaires et locataires, 
                  avec une couverture complète de vos intérêts
                </li>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Clauses en rigueur avec la loi</strong> : Toutes les clauses du bail sont conformes à la législation 
                  en vigueur et vous couvrent vraiment en cas de litige
                </li>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Sécurité pour votre investissement</strong> : En tant que propriétaire, votre bien immobilier 
                  est protégé par un document juridiquement solide qui sécurise votre patrimoine
                </li>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Gestion simplifiée</strong> : Processus digitalisé et rapide
                </li>
                <li style={{ marginBottom: "0" }}>
                  <strong>Conformité légale</strong> : Respect de toutes les réglementations en vigueur
                </li>
              </ul>
            </Section>

            <Text style={{ 
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: "24px",
              margin: "24px 0 20px 0"
            }}>
              Pour commencer, nous avons simplement besoin de savoir si vous êtes <strong>propriétaire</strong> ou <strong>locataire</strong>. 
              Cliquez sur le bouton ci-dessous pour choisir votre profil et accéder au formulaire adapté.
            </Text>

            <Section style={{ 
              textAlign: "center",
              margin: "32px 0"
            }}>
              <Button
                href={convertUrl}
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
                Choisir mon profil
              </Button>
            </Section>

            {/* Section accompagnement gratuit */}
            <Section style={{ 
              backgroundColor: "#f0fdf4",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "24px",
              paddingRight: "24px",
              borderRadius: "8px",
              margin: "24px 0"
            }}>
              <Heading style={{ 
                color: "#166534",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 12px 0"
              }}>
                🎁 Notre accompagnement est 100% gratuit
              </Heading>
              
              <Text style={{ 
                color: "#166534",
                fontSize: "15px",
                lineHeight: "22px",
                margin: "0 0 12px 0"
              }}>
                Chez BailNotarie, nous croyons que la sécurité de votre location ne devrait pas être un luxe. 
                C'est pourquoi nous vous accompagnons <strong>gratuitement</strong> dans toute la démarche :
              </Text>
              
              <ul style={{ 
                color: "#166534",
                fontSize: "15px",
                lineHeight: "22px",
                margin: "0",
                paddingLeft: "20px"
              }}>
                <li style={{ marginBottom: "8px" }}>
                  Assistance personnalisée à chaque étape
                </li>
                <li style={{ marginBottom: "8px" }}>
                  Vérification de tous vos documents
                </li>
                <li style={{ marginBottom: "8px" }}>
                  Support technique disponible
                </li>
                <li style={{ marginBottom: "0" }}>
                  Suivi jusqu'à la signature finale
                </li>
              </ul>
            </Section>



            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "20px",
              margin: "20px 0 0 0"
            }}>
              <strong>Questions ?</strong> Notre équipe est à votre disposition pour vous accompagner. 
              N'hésitez pas à nous contacter si vous avez besoin d'aide.
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
              <Link href="tel:+33768098624" style={{ color: "#6b7280", textDecoration: "none" }}>📞 07 68 09 86 24</Link> | <Link href={EMAIL_BASE_URL} style={{ color: "#6b7280", textDecoration: "none" }}>🌐 www.bailnotarie.fr</Link>
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

