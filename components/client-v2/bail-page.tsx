"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Euro, FileText, Home, Mail, MessageSquare, RotateCcw, UserRound } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import { PrimaryAction, QuietAction } from "./owner-ui";
import type { DetailModel } from "./detail-model";
import { DetailVariant } from "./detail-variants";
import { BAIL_TYPE_LABELS, STATUS_VIEW } from "./owner-bail-card";

/* =========================================================================
   La page d'un bail, côté propriétaire.

   Mise en page « Rail » : l'identité, l'état, les montants et les actions
   restent sous les yeux pendant qu'on lit le détail à côté. C'est la page la
   plus fournie de l'espace, et celle qui s'allongera encore.

   La route garde l'authentification, le contrôle d'accès et la requête ; ce
   composant ne fait que rendre ce qu'on lui donne.
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
  const familyLabel = bail.bailFamily
    ? BAIL_FAMILY_LABELS[bail.bailFamily] ?? bail.bailFamily
    : null;

  const model: DetailModel = {
    kind: "bail",
    eyebrow: "Le bail",
    title: propertyTitle,
    subtitle: [familyLabel, bail.property?.label ? bail.property.fullAddress : null]
      .filter(Boolean)
      .join(" · "),
    status: {
      label: view?.title ?? bail.status,
      tone: view?.tone ?? "slate",
      note: view?.note,
    },
    icon: FileText,
    backHref: "/client/proprietaire/demandes",
    trail: [
      { label: "Mes dossiers", href: "/client/proprietaire/demandes" },
      ...(bail.property
        ? [{ label: propertyTitle, href: `/client/proprietaire/biens/${bail.property.id}` }]
        : []),
      { label: "Le bail" },
    ],
    stats: [
      { label: "Loyer", value: formatCurrency(bail.rentAmount) },
      bail.monthlyCharges > 0
        ? { label: "Charges", value: formatCurrency(bail.monthlyCharges) }
        : null,
      bail.securityDeposit > 0
        ? { label: "Dépôt", value: formatCurrency(bail.securityDeposit) }
        : null,
      bail.monthlyCharges > 0 ? { label: "Total", value: formatCurrency(totalMonthly) } : null,
    ].filter(Boolean) as DetailModel["stats"],
    actions: (
      <>
        {bail.status === "TERMINATED" && (
          <Link href={`/client/proprietaire/baux/${bail.id}/renouveler`}>
            <PrimaryAction className="w-full py-2.5">
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
              <QuietAction className="w-full py-2.5">
                <MessageSquare className="h-4 w-4" />
                Discuter avec le notaire
              </QuietAction>
            }
          />
        )}
      </>
    ),
    sections: [
      {
        id: "contrat",
        title: "Le contrat",
        icon: FileText,
        fields: [
          { label: "Catégorie", value: familyLabel },
          {
            label: "Type de bail",
            value: bail.bailType ? BAIL_TYPE_LABELS[bail.bailType] ?? bail.bailType : null,
          },
          { label: "Date de début", value: formatDate(bail.effectiveDate) },
          { label: "Date de fin", value: endDate ? formatDate(endDate) : null },
          {
            label: "Jour de paiement",
            value: bail.paymentDay ? `Le ${bail.paymentDay} de chaque mois` : null,
          },
        ],
      },
      {
        id: "argent",
        title: "Loyer et charges",
        icon: Euro,
        fields: [
          { label: "Loyer mensuel", value: formatCurrency(bail.rentAmount) },
          {
            label: "Charges mensuelles",
            value: bail.monthlyCharges > 0 ? formatCurrency(bail.monthlyCharges) : null,
          },
          {
            label: "Dépôt de garantie",
            value: bail.securityDeposit > 0 ? formatCurrency(bail.securityDeposit) : null,
          },
          {
            label: "Total mensuel",
            value: bail.monthlyCharges > 0 ? formatCurrency(totalMonthly) : null,
          },
        ],
      },
      ...(tenantName
        ? [
            {
              id: "locataire",
              title: "Le locataire",
              icon: UserRound,
              fields: [
                { label: "Nom", value: tenantName },
                { label: "Email", value: tenantEmail },
              ],
              node: tenantEmail ? (
                <a
                  href={`mailto:${tenantEmail}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3563e9] transition-colors hover:text-[#2451c7]"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Écrire au locataire
                </a>
              ) : undefined,
            },
          ]
        : []),
      ...(bail.property
        ? [
            {
              id: "bien",
              title: "Le bien",
              icon: Building2,
              fields: [
                { label: "Adresse", value: bail.property.fullAddress, wide: true },
                { label: "Label", value: bail.property.label },
              ],
              node: (
                <Link
                  href={`/client/proprietaire/biens/${bail.property.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3563e9] transition-colors hover:text-[#2451c7]"
                >
                  <Home className="h-3.5 w-3.5" />
                  Voir la page du bien
                </Link>
              ),
            },
          ]
        : []),
      ...(bail.documents.length > 0
        ? [
            {
              id: "pieces",
              title: `Pièces du bail · ${bail.documents.length}`,
              icon: FileText,
              node: (
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
              ),
            },
          ]
        : []),
    ],
  };

  return <DetailVariant variant="rail" model={model} />;
}
