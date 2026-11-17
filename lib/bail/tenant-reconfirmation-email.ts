// Module serveur interne (pas une action appelable depuis le navigateur).

import { BailStatus, ClientType, ProfilType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import { getClientGreetingName } from "@/lib/actions/bail-audit-log";
import MailTenantReconfirmation, { tenantReconfirmationSubject } from "@/emails/mail-tenant-reconfirmation";

const FROM = "BailNotarie – Équipe <contact@bailnotarie.fr>";
const BASE_URL = () => process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
const CLOSED: BailStatus[] = [BailStatus.TERMINATED, BailStatus.DESISTE, BailStatus.CLASSE_SANS_SUITE];

export type TenantReconfirmationEmailData = {
  bailId: string;
  /** Date de la demande, telle qu'enregistrée sur le dossier (ISO) : sert à n'envoyer que pour cette demande-là. */
  requestedAt: string;
  changedLabels: string[];
};

/**
 * Envoie l'e-mail unique « vos conditions ont changé, merci de les confirmer » (M15), seulement si la demande
 * est toujours celle en cours : modification annulée, déjà reconfirmée, remplacée par une plus récente ou
 * dossier clos → rien n'est envoyé. Renvoie ce qui a été fait, pour le journal de la tâche de fond.
 */
export async function sendTenantReconfirmationEmail(data: TenantReconfirmationEmailData): Promise<{ sent: boolean; reason: string }> {
  const bail = await prisma.bail.findUnique({
    where: { id: data.bailId },
    select: {
      status: true,
      tenantConfirmedTermsAt: true,
      tenantReconfirmationRequestedAt: true,
      property: { select: { fullAddress: true, label: true } },
      parties: {
        where: { profilType: ProfilType.LOCATAIRE },
        take: 1,
        select: {
          type: true,
          persons: { where: { isPrimary: true }, take: 1, select: { firstName: true, lastName: true, email: true } },
          entreprise: { select: { legalName: true, name: true, email: true } },
        },
      },
    },
  });
  if (!bail) return { sent: false, reason: "dossier introuvable" };
  if (CLOSED.includes(bail.status)) return { sent: false, reason: "dossier clos" };
  if (bail.tenantConfirmedTermsAt) return { sent: false, reason: "déjà reconfirmé" };
  if (bail.tenantReconfirmationRequestedAt?.toISOString() !== data.requestedAt) {
    return { sent: false, reason: "demande annulée ou remplacée" };
  }
  const tenant = bail.parties[0];
  const email = tenant?.type === ClientType.PERSONNE_MORALE ? tenant.entreprise?.email || tenant.persons[0]?.email : tenant?.persons[0]?.email || tenant?.entreprise?.email;
  if (!tenant || !email) return { sent: false, reason: "aucune adresse e-mail pour le locataire" };

  const props = {
    name: getClientGreetingName(tenant) || "",
    address: bail.property?.fullAddress || bail.property?.label || "votre logement",
    changedLabels: data.changedLabels,
    actionUrl: `${BASE_URL()}/client/locataire/baux/${data.bailId}`,
  };
  const result = await resendSendEmail({
    from: FROM,
    to: email,
    subject: tenantReconfirmationSubject,
    react: MailTenantReconfirmation(props),
  });
  if (result?.error) throw new Error(`Envoi impossible : ${result.error.message}`);
  return { sent: true, reason: "envoyé" };
}
