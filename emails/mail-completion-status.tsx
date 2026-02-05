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

interface MailCompletionStatusProps {
  clientName?: string | null;
  entityType: "client" | "property";
  entityName?: string | null;
  oldStatus: string;
  newStatus: string;
  dashboardUrl: string;
  profilType?: "PROPRIETAIRE" | "LOCATAIRE";
}

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  PARTIAL: "Partiel",
  PENDING_CHECK: "En vérification",
  COMPLETED: "Complété",
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  NOT_STARTED: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
  PARTIAL: { bg: "#fef3c7", text: "#92400e", border: "#fbbf24" },
  PENDING_CHECK: { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" },
  COMPLETED: { bg: "#d1fae5", text: "#065f46", border: "#10b981" },
};

const statusIcons: Record<string, string> = {
  NOT_STARTED: "⚪",
  PARTIAL: "🟡",
  PENDING_CHECK: "🔵",
  COMPLETED: "✅",
};

export default function MailCompletionStatus({
  clientName,
  entityType,
  entityName,
  oldStatus,
  newStatus,
  dashboardUrl,
  profilType
}: MailCompletionStatusProps) {
  const oldStatusLabel = statusLabels[oldStatus] || oldStatus;
  const newStatusLabel = statusLabels[newStatus] || newStatus;
  const oldStatusColor = statusColors[oldStatus] || statusColors.NOT_STARTED;
  const newStatusColor = statusColors[newStatus] || statusColors.NOT_STARTED;
  const oldStatusIcon = statusIcons[oldStatus] || "⚪";
  const newStatusIcon = statusIcons[newStatus] || "⚪";

  const entityLabel = entityType === "client" 
    ? (profilType === "PROPRIETAIRE" ? "vos informations personnelles" : "vos informations personnelles")
    : "votre bien";

  const title = newStatus === "COMPLETED" 
    ? "✅ Vérification complétée avec succès"
    : newStatus === "PENDING_CHECK"
    ? "🔵 Vérification en cours"
    : "📋 Statut de vérification mis à jour";

  const message = newStatus === "COMPLETED"
    ? `Félicitations ! La vérification de ${entityLabel} a été complétée avec succès. Toutes les données sont conformes et vérifiées.`
    : newStatus === "PENDING_CHECK"
    ? `Vos données ont été soumises et sont maintenant en cours de vérification par notre équipe. Vous serez notifié une fois la vérification terminée.`
    : `Le statut de vérification de ${entityLabel} a été mis à jour.`;

  return (
    <Html>
      <Head />
      <Body style={{ 
        backgroundColor: "#f8fafc", 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
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
          </Section>

          {/* Contenu principal */}
          <Section style={{ paddingTop: "40px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px" }}>
            <Heading style={{ 
              color: "#2563eb",
              fontSize: "28px",
              fontWeight: "bold",
              margin: "0 0 24px 0",
              textAlign: "center"
            }}>
              {title}
            </Heading>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "18px",
              lineHeight: "1.6",
              margin: "0 0 24px 0",
              fontWeight: "500"
            }}>
              {clientName ? `Bonjour ${clientName},` : "Bonjour,"}
            </Text>
            
            <Text style={{ 
              color: "#374151",
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 32px 0"
            }}>
              {message}
            </Text>

            {/* Détails de l'entité */}
            {entityName && (
              <Section style={{ 
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                paddingTop: "16px",
                paddingBottom: "16px",
                paddingLeft: "20px",
                paddingRight: "20px",
                margin: "24px 0",
                border: "1px solid #e5e7eb"
              }}>
                <Text style={{ 
                  color: "#6b7280",
                  fontSize: "14px",
                  margin: "0 0 4px 0",
                  fontWeight: "500"
                }}>
                  {entityType === "client" ? "Client" : "Bien"} :
                </Text>
                <Text style={{ 
                  color: "#111827",
                  fontSize: "16px",
                  margin: 0,
                  fontWeight: "600"
                }}>
                  {entityName}
                </Text>
              </Section>
            )}

            {/* Changement de statut */}
            <Section style={{ 
              backgroundColor: "#f0f9ff",
              borderRadius: "12px",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "24px",
              paddingRight: "24px",
              margin: "32px 0",
              border: "2px solid #bfdbfe"
            }}>
              <Text style={{ 
                color: "#1e40af",
                fontSize: "16px",
                fontWeight: "600",
                margin: "0 0 20px 0",
                textAlign: "center"
              }}>
                📊 Évolution du statut de vérification
              </Text>
              
              {/* Ancien statut */}
              <Section style={{ 
                marginBottom: "16px",
                padding: "16px",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: `2px solid ${oldStatusColor.border}`
              }}>
                <Text style={{ 
                  color: "#6b7280",
                  fontSize: "12px",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Ancien statut
                </Text>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Text style={{ 
                    fontSize: "20px",
                    margin: 0
                  }}>
                    {oldStatusIcon}
                  </Text>
                  <Text style={{ 
                    color: oldStatusColor.text,
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: 0
                  }}>
                    {oldStatusLabel}
                  </Text>
                </div>
              </Section>

              {/* Flèche */}
              <div style={{ textAlign: "center", margin: "8px 0" }}>
                <Text style={{ fontSize: "24px", margin: 0 }}>⬇️</Text>
              </div>

              {/* Nouveau statut */}
              <Section style={{ 
                padding: "16px",
                backgroundColor: newStatusColor.bg,
                borderRadius: "8px",
                border: `2px solid ${newStatusColor.border}`
              }}>
                <Text style={{ 
                  color: "#6b7280",
                  fontSize: "12px",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Nouveau statut
                </Text>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Text style={{ 
                    fontSize: "20px",
                    margin: 0
                  }}>
                    {newStatusIcon}
                  </Text>
                  <Text style={{ 
                    color: newStatusColor.text,
                    fontSize: "18px",
                    fontWeight: "bold",
                    margin: 0
                  }}>
                    {newStatusLabel}
                  </Text>
                </div>
              </Section>
            </Section>

            {/* Message contextuel selon le nouveau statut */}
            {newStatus === "COMPLETED" && (
              <Section style={{ 
                backgroundColor: "#d1fae5",
                borderRadius: "8px",
                paddingTop: "20px",
                paddingBottom: "20px",
                paddingLeft: "20px",
                paddingRight: "20px",
                margin: "24px 0",
                border: "2px solid #10b981"
              }}>
                <Text style={{ 
                  color: "#065f46",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: 0,
                  fontWeight: "500"
                }}>
                  ✨ Toutes vos données sont maintenant vérifiées et conformes. Vous pouvez procéder à la création de baux et de biens.
                </Text>
              </Section>
            )}

            {newStatus === "PENDING_CHECK" && (
              <Section style={{ 
                backgroundColor: "#dbeafe",
                borderRadius: "8px",
                paddingTop: "20px",
                paddingBottom: "20px",
                paddingLeft: "20px",
                paddingRight: "20px",
                margin: "24px 0",
                border: "2px solid #3b82f6"
              }}>
                <Text style={{ 
                  color: "#1e40af",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: 0,
                  fontWeight: "500"
                }}>
                  ⏳ Notre équipe vérifie actuellement vos données. Vous recevrez une notification dès que la vérification sera terminée.
                </Text>
              </Section>
            )}

            {/* CTA principal */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href={dashboardUrl}
                style={{ 
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "16px 32px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: "bold",
                  display: "inline-block",
                  boxShadow: "0 4px 6px rgba(37, 99, 235, 0.3)"
                }}
              >
                Accéder à mon dashboard
              </Button>
            </Section>

            <Text style={{ 
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0 0 32px 0",
              textAlign: "center"
            }}>
              Connectez-vous à votre espace client pour consulter tous les détails et suivre l'avancement de vos dossiers.
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
              <strong>BailNotarie</strong> - Notification automatique de statut
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
              Cette notification a été générée automatiquement suite à un changement de statut de vérification.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}


