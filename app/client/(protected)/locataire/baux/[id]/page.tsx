import { requireLocataireAuth } from "@/lib/auth-helpers";
import { canAccessBail } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, Home, MessageSquare, ScanSearch, Store, UserRound } from "lucide-react";
import { BailStatus, ProfilType } from "@prisma/client";

import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import { getDocumentLabel } from "@/lib/utils/document-labels";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import {
  FieldGrid,
  IconTile,
  MicroLabel,
  OwnerCanvas,
  Pill,
  PrimaryAction,
  ReadField,
  Surface,
} from "@/components/client-v2/owner-ui";
import { TenantStepBar } from "@/components/client-v2/tenant/tenant-bail-line";
import { BAIL_TYPE_LABELS, STATUS_VIEW, STEP_INDEX, TERMINAL_STATUSES } from "@/components/client-v2/tenant/model";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/* Libellés d'origine, conservés comme repli : ils couvrent tous les statuts
   de l'énumération, là où l'écriture côté locataire n'en nomme que les
   étapes qu'un locataire traverse. */
const statusLabels: Record<BailStatus, string> = {
  DRAFT: "Brouillon",
  AWAITING_TENANT: "En attente du locataire",
  AWAITING_TENANT_FORM: "En attente du formulaire locataire",
  PENDING_VALIDATION: "En attente de validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Actif",
  TERMINATED: "Terminé",
  DESISTE: "Désisté",
  CLASSE_SANS_SUITE: "Classé sans suite",
};

export default async function LocataireBailDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user, client } = await requireLocataireAuth();
  const resolvedParams = await params;
  const bailId = resolvedParams.id;
  const resolvedSearch = await searchParams;
  const openChat = resolvedSearch?.chat === "1";

  // Vérifier que le client peut accéder à ce bail
  const hasAccess = await canAccessBail(user.id, bailId);
  if (!hasAccess) {
    notFound();
  }

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      property: {
        include: {
          owner: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
      },
      parties: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      dossierAssignments: {
        include: {
          notaire: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 1,
      },
      documents: {
        where: {
          // Afficher uniquement les documents liés au client connecté
          // ou les documents sans client spécifique (documents généraux du bail)
          OR: [
            { clientId: client.id },
            { clientId: null },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!bail) {
    notFound();
  }

  const proprietaire = bail.parties.find(p => p.profilType === ProfilType.PROPRIETAIRE) || bail.property.owner;
  const proprietaireName = proprietaire?.entreprise 
    ? proprietaire.entreprise.legalName || proprietaire.entreprise.name
    : proprietaire?.persons?.[0] 
      ? `${proprietaire.persons[0].firstName || ""} ${proprietaire.persons[0].lastName || ""}`.trim()
      : "Non défini";

  const notaire = bail.dossierAssignments[0]?.notaire;

  // ── Mise en forme ──────────────────────────────────────────────────────────
  const view = STATUS_VIEW[bail.status];
  const statusTitle = view?.title ?? statusLabels[bail.status];
  const statusTone = view?.tone ?? "slate";
  const terminal = TERMINAL_STATUSES.includes(bail.status);
  const isCommercial = bail.bailFamily === "COMMERCIAL";
  const propertyTitle = bail.property.label || bail.property.fullAddress || "Mon bail";

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:pb-14">
        {/* ── Retour + identité du bail ──────────────────────────────────── */}
        <Link
          href="/client/locataire/baux"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Mes baux
        </Link>

        <header className="mb-6 mt-3">
          <MicroLabel>Espace locataire</MicroLabel>
          <div className="mt-2 flex items-start gap-3.5">
            <IconTile icon={isCommercial ? Store : Home} tone="blue" size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="lp-title truncate text-[24px] font-bold text-slate-900 sm:text-[28px]">
                {propertyTitle}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Pill tone={statusTone}>{statusTitle}</Pill>
                {bail.property.fullAddress && (
                  <span className="truncate text-[12.5px] text-slate-500">
                    {bail.property.fullAddress}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!terminal && (
            <TenantStepBar
              stepIndex={STEP_INDEX[bail.status] ?? 0}
              signed={bail.status === "SIGNED"}
              className="mt-5 max-w-[360px]"
            />
          )}
          {view?.note && (
            <p className="mt-3 text-[13px] leading-snug text-slate-500">{view.note}</p>
          )}
        </header>

        <div className="space-y-4">
          {/* ── Le bail ──────────────────────────────────────────────────── */}
          <Surface tone="raised" className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <IconTile icon={FileText} tone="blue" size="sm" />
              <MicroLabel>Le bail</MicroLabel>
            </div>
            <FieldGrid>
              <ReadField
                label="Type de bail"
                value={bail.bailType ? BAIL_TYPE_LABELS[bail.bailType] || bail.bailType : null}
              />
              <ReadField label="Loyer mensuel" value={formatCurrency(bail.rentAmount)} />
              {bail.monthlyCharges > 0 && (
                <ReadField label="Charges mensuelles" value={formatCurrency(bail.monthlyCharges)} />
              )}
              {bail.securityDeposit > 0 && (
                <ReadField label="Dépôt de garantie" value={formatCurrency(bail.securityDeposit)} />
              )}
              <ReadField label="Date de début" value={formatDate(bail.effectiveDate)} />
              {bail.endDate && <ReadField label="Date de fin" value={formatDate(bail.endDate)} />}
              {bail.paymentDay && (
                <ReadField label="Jour de paiement" value={`Le ${bail.paymentDay} de chaque mois`} />
              )}
            </FieldGrid>
          </Surface>

          {/* ── Le bien ──────────────────────────────────────────────────── */}
          <Surface tone="raised" className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <IconTile icon={Building2} tone="blue" size="sm" />
              <MicroLabel>Le bien</MicroLabel>
            </div>
            <FieldGrid>
              <ReadField label="Adresse" value={bail.property.fullAddress} wide />
              {bail.property.label && <ReadField label="Label" value={bail.property.label} />}
              {bail.property.surfaceM2 && (
                <ReadField label="Surface" value={`${bail.property.surfaceM2.toString()} m²`} />
              )}
            </FieldGrid>
          </Surface>

          {/* ── Les personnes ────────────────────────────────────────────── */}
          {(proprietaire || notaire) && (
            <Surface tone="raised" className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <IconTile icon={UserRound} tone="blue" size="sm" />
                <MicroLabel>Vos interlocuteurs</MicroLabel>
              </div>
              <FieldGrid>
                {proprietaire && <ReadField label="Propriétaire" value={proprietaireName} />}
                {notaire && (
                  <ReadField label="Notaire" value={notaire.name || notaire.email} />
                )}
                {notaire?.email && <ReadField label="Email du notaire" value={notaire.email} />}
              </FieldGrid>

              {notaire && (
                <div className="mt-4">
                  <BailChatSheet
                    bailId={bailId}
                    defaultOpen={openChat}
                    trigger={
                      <PrimaryAction className="w-full py-3 sm:w-auto">
                        <MessageSquare className="h-4 w-4" />
                        Contacter le notaire
                      </PrimaryAction>
                    }
                  />
                </div>
              )}
            </Surface>
          )}

          {/* ── Documents ────────────────────────────────────────────────── */}
          {bail.documents.length > 0 && (
            <Surface tone="raised" className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <IconTile icon={ScanSearch} tone="blue" size="sm" />
                <MicroLabel>
                  Documents · {bail.documents.length}
                </MicroLabel>
              </div>
              <div className="space-y-2">
                {bail.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate text-[13px] font-medium text-slate-800">
                        {doc.label || getDocumentLabel(doc.kind)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-slate-400">
                      {formatDateTime(doc.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      </div>
    </OwnerCanvas>
  );
}
