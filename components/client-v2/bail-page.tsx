"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Euro,
  FileText,
  Home,
  Mail,
  MessageSquare,
  RotateCcw,
  Scale,
  UserRound,
} from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import {
  FieldGrid,
  IconTile,
  MicroLabel,
  OwnerCanvas,
  PageNav,
  Pill,
  PrimaryAction,
  QuietAction,
  ReadField,
  Surface,
} from "./owner-ui";
import { BAIL_TYPE_LABELS, STATUS_VIEW } from "./owner-bail-card";

/* =========================================================================
   La page d'un bail, côté propriétaire.

   Elle remplace le tiroir. La route garde l'authentification, le contrôle
   d'accès et la requête ; ce composant ne fait que rendre ce qu'on lui donne.
   Les libellés de statut et de type viennent du même dictionnaire que les
   lignes de « Mes dossiers » : un seul vocabulaire dans tout l'espace.
   ========================================================================= */

const BAIL_FAMILY_LABELS: Record<string, string> = {
  HABITATION: "Bail d'habitation",
  COMMERCIAL: "Bail commercial",
};

export type BailPageData = {
  id: string;
  status: string;
  bailType: string | null;
  bailFamily: string | null;
  rentAmount: number | null;
  monthlyCharges: number;
  securityDeposit: number;
  effectiveDate: Date | string | null;
  paymentDay: number | null;
  property: { id: string; label: string | null; fullAddress: string | null } | null;
  documents: Array<{
    id: string;
    kind: string;
    label: string | null;
    fileKey: string;
    mimeType: string | null;
    createdAt: Date | string;
  }>;
};

export function BailPage({
  bail,
  tenantName,
  tenantEmail,
  hasNotaire,
  openChat,
}: {
  bail: BailPageData;
  tenantName: string | null;
  tenantEmail: string | null;
  hasNotaire: boolean;
  openChat: boolean;
}) {
  const view = STATUS_VIEW[bail.status];
  const endDate = calculateBailEndDate(bail.effectiveDate as any, bail.bailType as any);
  const totalMonthly = (bail.rentAmount ?? 0) + bail.monthlyCharges;
  const propertyTitle = bail.property?.label || bail.property?.fullAddress || "Le bien";

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <PageNav
          backHref="/client/proprietaire/demandes"
          backLabel="Retour"
          trail={[
            { label: "Mes dossiers", href: "/client/proprietaire/demandes" },
            ...(bail.property
              ? [{ label: propertyTitle, href: `/client/proprietaire/biens/${bail.property.id}` }]
              : []),
            { label: "Le bail" },
          ]}
        />

        {/* ── Identité du bail ──────────────────────────────────────────── */}
        <header className="mb-6 mt-5">
          <MicroLabel>Le bail</MicroLabel>
          <div className="mt-2 flex items-start gap-3.5">
            <IconTile icon={FileText} tone="blue" size="lg" />
            <div className="min-w-0 flex-1">
              {/* Le bien nomme la page ; l'état du dossier se lit en pastille,
                  comme sur les lignes de « Mes dossiers ». */}
              <h1 className="lp-title truncate text-[24px] font-bold text-slate-900 sm:text-[28px]">
                {propertyTitle}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Pill tone={view?.tone ?? "slate"}>{view?.title ?? bail.status}</Pill>
                {bail.bailFamily && (
                  <span className="text-[12.5px] text-slate-500">
                    {BAIL_FAMILY_LABELS[bail.bailFamily] ?? bail.bailFamily}
                  </span>
                )}
              </div>
            </div>
          </div>
          {view?.note && (
            <p className="mt-3 text-[13px] leading-snug text-slate-500">{view.note}</p>
          )}

          {/* ── Ce qu'on peut faire depuis ici ──────────────────────────── */}
          <div className="mt-5 flex flex-wrap gap-2">
            {bail.status === "TERMINATED" && (
              <Link href={`/client/proprietaire/baux/${bail.id}/renouveler`}>
                <PrimaryAction className="py-2.5">
                  <RotateCcw className="h-4 w-4" />
                  Renouveler le bail
                </PrimaryAction>
              </Link>
            )}
            {hasNotaire && (
              <BailChatSheet
                bailId={bail.id}
                defaultOpen={openChat}
                trigger={
                  <QuietAction className="py-2.5">
                    <MessageSquare className="h-4 w-4" />
                    Discuter avec le notaire
                  </QuietAction>
                }
              />
            )}
          </div>
        </header>

        <div className="space-y-4">
          {/* ── Le contrat ──────────────────────────────────────────────── */}
          <Surface tone="raised" className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <IconTile icon={FileText} tone="blue" size="sm" />
              <MicroLabel>Le contrat</MicroLabel>
            </div>
            <FieldGrid>
              {bail.bailFamily && (
                <ReadField
                  label="Catégorie"
                  value={BAIL_FAMILY_LABELS[bail.bailFamily] ?? bail.bailFamily}
                />
              )}
              {bail.bailType && (
                <ReadField
                  label="Type de bail"
                  value={BAIL_TYPE_LABELS[bail.bailType] ?? bail.bailType}
                />
              )}
              <ReadField label="Date de début" value={formatDate(bail.effectiveDate)} />
              <ReadField label="Date de fin" value={endDate ? formatDate(endDate) : null} />
              {bail.paymentDay && (
                <ReadField label="Jour de paiement" value={`Le ${bail.paymentDay} de chaque mois`} />
              )}
            </FieldGrid>
          </Surface>

          {/* ── L'argent ────────────────────────────────────────────────── */}
          <Surface tone="raised" className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <IconTile icon={Euro} tone="blue" size="sm" />
              <MicroLabel>Loyer et charges</MicroLabel>
            </div>
            <FieldGrid>
              <ReadField label="Loyer mensuel" value={formatCurrency(bail.rentAmount)} />
              {bail.monthlyCharges > 0 && (
                <ReadField label="Charges mensuelles" value={formatCurrency(bail.monthlyCharges)} />
              )}
              {bail.securityDeposit > 0 && (
                <ReadField label="Dépôt de garantie" value={formatCurrency(bail.securityDeposit)} />
              )}
              {bail.monthlyCharges > 0 && (
                <ReadField label="Total mensuel" value={formatCurrency(totalMonthly)} />
              )}
            </FieldGrid>
          </Surface>

          {/* ── Le locataire ────────────────────────────────────────────── */}
          {tenantName && (
            <Surface tone="raised" className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <IconTile icon={UserRound} tone="blue" size="sm" />
                <MicroLabel>Le locataire</MicroLabel>
              </div>
              <FieldGrid>
                <ReadField label="Nom" value={tenantName} />
                {tenantEmail && <ReadField label="Email" value={tenantEmail} />}
              </FieldGrid>
              {tenantEmail && (
                <a
                  href={`mailto:${tenantEmail}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3563e9] transition-colors hover:text-[#2451c7]"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Écrire au locataire
                </a>
              )}
            </Surface>
          )}

          {/* ── Le bien ─────────────────────────────────────────────────── */}
          {bail.property && (
            <Surface tone="raised" className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <IconTile icon={Building2} tone="blue" size="sm" />
                <MicroLabel>Le bien</MicroLabel>
              </div>
              <FieldGrid>
                <ReadField label="Adresse" value={bail.property.fullAddress} wide />
                {bail.property.label && <ReadField label="Label" value={bail.property.label} />}
              </FieldGrid>
              <Link
                href={`/client/proprietaire/biens/${bail.property.id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3563e9] transition-colors hover:text-[#2451c7]"
              >
                <Home className="h-3.5 w-3.5" />
                Voir la page du bien
              </Link>
            </Surface>
          )}

          {/* ── Pièces ──────────────────────────────────────────────────── */}
          {bail.documents.length > 0 && (
            <Surface tone="raised" className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <IconTile icon={Scale} tone="blue" size="sm" />
                <MicroLabel>Pièces du bail · {bail.documents.length}</MicroLabel>
              </div>
              <div className="space-y-2">
                {bail.documents.map((document) => (
                  <BailDocumentPreview
                    key={document.id}
                    document={{
                      id: document.id,
                      label: document.label,
                      kind: document.kind,
                      fileKey: document.fileKey,
                      mimeType: document.mimeType,
                      createdAt: document.createdAt,
                    }}
                  />
                ))}
              </div>
            </Surface>
          )}
        </div>
      </div>
    </OwnerCanvas>
  );
}
