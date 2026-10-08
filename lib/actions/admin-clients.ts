"use server";

import { ClientType, ProfilType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { computeClientMissingData } from "@/lib/utils/completion-status";
import { describeMissingItems } from "@/lib/utils/missing-items";
import { formatPhone } from "@/lib/utils/phone-format";
import { getStage, isActiveStage } from "@/lib/utils/bail-stage";

export interface ClientListRow {
  id: string;
  /** Champs repris par le menu « … » de la ligne (actions existantes). */
  type: ClientType;
  profilType: ProfilType;
  persons: Array<{ firstName: string | null; lastName: string | null; email: string | null; isPrimary: boolean }>;
  entreprise: { legalName: string | null; name: string | null; email: string | null } | null;
  name: string;
  kind: string;
  email: string | null;
  phone: string | null;
  dossiers: Array<{ id: string; address: string; active: boolean }>;
  completionStatus: string;
  missingItems: string[];
  /** Détail affiché sous l'état (« Manque : … », « Formulaire rempli le … »). */
  stateDetail: string;
  /** Un dossier en cours attend ce client (manques à fournir). */
  blocking: boolean;
  activityAt: string;
  /** Clients liés par un bail (propriétaire ↔ locataire), pour les regrouper. */
  linkedIds: string[];
  search: string;
}

const fmt = (date: Date) => date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** Liste des clients de la page « Clients » (maquette) : état, manques, dossiers, activité. */
export async function getClientsList(): Promise<ClientListRow[]> {
  await requireAuth();

  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      persons: { orderBy: { isPrimary: "desc" }, include: { documents: { select: { kind: true } } } },
      entreprise: { include: { documents: { select: { kind: true } } } },
      documents: { select: { kind: true } },
      bails: {
        select: {
          id: true,
          status: true,
          property: { select: { fullAddress: true, label: true } },
          parties: { select: { id: true } },
        },
      },
      intakeLinks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, submittedAt: true, formEmailSentAt: true, lastFormEmailSentAt: true, createdAt: true },
      },
    },
  });

  return clients.map((client) => {
    const isCompany = client.type === ClientType.PERSONNE_MORALE;
    const persons = client.persons || [];
    const primary = persons.find((p) => p.isPrimary) || persons[0];
    const lastNames = Array.from(new Set(persons.map((p) => p.lastName).filter(Boolean)));
    const name = isCompany
      ? client.entreprise?.legalName || client.entreprise?.name || "Société"
      : persons.length > 1 && lastNames.length === 1
        ? `${persons.map((p) => p.firstName).filter(Boolean).join(" et ")} ${lastNames[0]}`
        : persons.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ") ||
          primary?.email ||
          "Sans nom";
    const kind = isCompany
      ? ["Société", client.entreprise?.registration].filter(Boolean).join(" · ")
      : persons.length > 1
        ? `Particuliers · ${persons.length} personnes`
        : "Particulier";

    const isLead = client.profilType === ProfilType.LEAD;
    const missingItems = isLead ? [] : describeMissingItems(computeClientMissingData(client as any).missingData);
    const dossiers = client.bails.map((b) => ({
      id: b.id,
      address: b.property?.fullAddress || b.property?.label || "Bien sans adresse",
      active: isActiveStage(getStage(b.status).key),
    }));
    const intake = client.intakeLinks[0];

    let stateDetail: string;
    if (isLead) stateDetail = `Prospect depuis le ${fmt(client.createdAt)}`;
    else if (missingItems.length > 0) {
      const shown = missingItems.slice(0, 2).join(", ").toLowerCase();
      stateDetail = `Manque : ${shown}${missingItems.length > 2 ? ` et ${missingItems.length - 2} autre${missingItems.length > 3 ? "s" : ""}` : ""}`;
    } else if (intake?.submittedAt) stateDetail = `Formulaire rempli le ${fmt(intake.submittedAt)}`;
    else if (client.completionStatus === "COMPLETED") stateDetail = "Dossier client complet";
    else if (intake && intake.status === "PENDING") {
      const sent = intake.formEmailSentAt || intake.lastFormEmailSentAt;
      stateDetail = sent ? `Formulaire envoyé le ${fmt(sent)}, non rempli` : "Formulaire en attente";
    } else stateDetail = "Rien ne manque";

    const email = isCompany ? client.entreprise?.email || null : primary?.email || null;
    const phone = formatPhone(isCompany ? client.entreprise?.phone : primary?.phone);
    const linkedIds = Array.from(new Set(client.bails.flatMap((b) => b.parties.map((p) => p.id)).filter((partyId) => partyId !== client.id)));

    return {
      id: client.id,
      type: client.type,
      profilType: client.profilType,
      persons: persons.map((p) => ({ firstName: p.firstName, lastName: p.lastName, email: p.email, isPrimary: p.isPrimary })),
      entreprise: client.entreprise
        ? { legalName: client.entreprise.legalName, name: client.entreprise.name, email: client.entreprise.email }
        : null,
      name,
      kind,
      email,
      phone,
      dossiers,
      completionStatus: client.completionStatus,
      missingItems,
      stateDetail,
      blocking: !isLead && missingItems.length > 0 && dossiers.some((d) => d.active),
      activityAt: client.updatedAt.toISOString(),
      linkedIds,
      search: [
        name,
        kind,
        email,
        phone,
        primary?.phone,
        client.entreprise?.legalName,
        client.entreprise?.name,
        client.entreprise?.registration,
        ...persons.flatMap((p) => [p.firstName, p.lastName, p.email, p.phone]),
        ...dossiers.map((d) => d.address),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });
}
