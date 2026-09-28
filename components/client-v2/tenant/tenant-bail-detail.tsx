"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, Home, MessageSquare, ScanSearch, Store, UserRound } from "lucide-react";

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
} from "../owner-ui";
import { TenantStepBar } from "./tenant-bail-line";
import { BAIL_TYPE_LABELS, STATUS_VIEW, STEP_INDEX, TERMINAL_STATUSES } from "./model";

/* =========================================================================
   La page d'un bail, côté locataire — rendu seul.

   La route garde l'intégralité de la logique : authentification, contrôle
   d'accès, requête, calculs. Elle ne passe ici que des données déjà prêtes.
   Ce découpage permet aussi de juger la page dans la maquette, sans session
   ni base de données.
   ========================================================================= */

export type TenantBailDetailData = {
  id: string;
  status: string;
  bailType: string | null;
  bailFamily: string | null;
  rentAmount: number | null;
  monthlyCharges: number;
  securityDeposit: number;
  effectiveDate: Date | string | null;
  endDate: Date | string | null;
  paymentDay: number | null;
  property: {
    label: string | null;
    fullAddress: string | null;
    surfaceM2: { toString(): string } | null;
  };
  documents: Array<{
    id: string;
    kind: string;
    label: string | null;
    createdAt: Date | string;
  }>;
};

export function TenantBailDetail({
  bail,
  bailId,
  proprietaireName,
  hasProprietaire,
  notaire,
  openChat,
  /** Dans la maquette, la messagerie n'est pas branchée. */
  demoChat = false,
}: {
  bail: TenantBailDetailData;
  bailId: string;
  proprietaireName: string | null;
  hasProprietaire: boolean;
  notaire: { name: string | null; email: string } | null;
  openChat: boolean;
  demoChat?: boolean;
}) {
  // ── Mise en forme ──────────────────────────────────────────────────────────
  const view = STATUS_VIEW[bail.status];
  const statusTitle = view?.title ?? bail.status;
  const statusTone = view?.tone ?? "slate";
  const terminal = TERMINAL_STATUSES.includes(bail.status);
  const isCommercial = bail.bailFamily === "COMMERCIAL";
  const propertyTitle = bail.property.label || bail.property.fullAddress || "Mon bail";
  const proprietaire = hasProprietaire;

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
                  {demoChat ? (
                    <PrimaryAction className="w-full py-3 sm:w-auto" disabled>
                      <MessageSquare className="h-4 w-4" />
                      Contacter le notaire
                    </PrimaryAction>
                  ) : (
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
                  )}
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
