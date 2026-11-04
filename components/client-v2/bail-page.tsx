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
  Store,
  UserPlus,
  UserRound,
} from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { commercialPaymentText, commercialTermsSummary, commercialVatText } from "@/lib/utils/commercial-terms";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import { FileUpload } from "@/components/ui/file-upload";
import { PROOF_LABELS } from "@/lib/utils/rent-relocation";
import { useRouter } from "next/navigation";
import { PrimaryAction, QuietAction } from "./owner-ui";
import { SubPageBar } from "./owner-tabs";
import { AddTenantDialog } from "./add-tenant-dialog";
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
  /** Conditions du bail commercial (réponses du formulaire). */
  commercialTerms?: unknown;
  property: { id: string; label: string | null; fullAddress: string | null } | null;
  documents: BailPageDocument[];
  /** Pièces du bien loué (diagnostics, titre de propriété, règlement…). */
  propertyDocuments?: BailPageDocument[];
};

type BailPageDocument = {
  id: string;
  kind: string;
  label: string | null;
  fileKey: string;
  mimeType: string | null;
  createdAt: Date | string;
};

/** Liste de pièces, avec aperçu et téléchargement. */
function DocumentList({ documents }: { documents: BailPageDocument[] }) {
  return (
    <div className="space-y-2">
      {documents.map((document) => (
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
  );
}

/** Pièces du dossier : celles du bien, puis celles propres au bail. */
function DossierDocuments({
  propertyDocuments,
  bailDocuments,
}: {
  propertyDocuments: BailPageDocument[];
  bailDocuments: BailPageDocument[];
}) {
  if (propertyDocuments.length === 0 && bailDocuments.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-[#5b6478]">
        Aucune pièce pour l&apos;instant. Les documents envoyés dans le formulaire (diagnostics, titre de propriété,
        règlement…) apparaîtront ici.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {propertyDocuments.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5b6478]">
            Le bien · {propertyDocuments.length}
          </p>
          <DocumentList documents={propertyDocuments} />
        </div>
      )}
      {bailDocuments.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5b6478]">
            Le bail · {bailDocuments.length}
          </p>
          <DocumentList documents={bailDocuments} />
        </div>
      )}
    </div>
  );
}

export function BailPage({
  bail,
  tenantName,
  tenantEmail,
  hasNotaire,
  notaireName,
  openChat,
  missingRentProofs = [],
}: {
  bail: BailPageData;
  /** Justificatifs du loyer encore attendus (relocation en zone tendue). */
  missingRentProofs?: string[];
  tenantName: string | null;
  tenantEmail: string | null;
  hasNotaire: boolean;
  /** Le notaire en charge du dossier, quand il en porte un nom. */
  notaireName: string | null;
  openChat: boolean;
}) {
  // Le locataire manque tant que le bail l'attend : c'est l'action qui débloque
  // le dossier, et elle n'était atteignable que depuis la liste.
  const missingTenant = bail.status === "AWAITING_TENANT" && !tenantName;
  const [tenantDialog, setTenantDialog] = React.useState(false);

  const view = STATUS_VIEW[bail.status];
  const endDate = calculateBailEndDate(bail.effectiveDate as any, bail.bailType as any);
  const totalMonthly = (bail.rentAmount ?? 0) + bail.monthlyCharges;
  const propertyTitle = bail.property?.label || bail.property?.fullAddress || "Le bien";
  const familyLabel = bail.bailFamily
    ? BAIL_FAMILY_LABELS[bail.bailFamily] ?? bail.bailFamily
    : null;
  // Bail commercial : loyer hors taxes, paiement mensuel ou trimestriel, TVA éventuelle.
  const isCommercial = bail.bailFamily === "COMMERCIAL";
  const terms = bail.commercialTerms as any;
  const ht = isCommercial ? " HT" : "";
  const commercialRows = isCommercial
    ? commercialTermsSummary(terms, { bailType: bail.bailType, rentAmount: bail.rentAmount }, { omitRent: true })
    : [];

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
      { label: `Loyer${ht}`, value: formatCurrency(bail.rentAmount) },
      bail.monthlyCharges > 0
        ? { label: "Charges", value: formatCurrency(bail.monthlyCharges) }
        : null,
      bail.securityDeposit > 0
        ? { label: "Dépôt", value: formatCurrency(bail.securityDeposit) }
        : null,
      bail.monthlyCharges > 0 ? { label: `Total${ht}`, value: formatCurrency(totalMonthly) } : null,
    ].filter(Boolean) as DetailModel["stats"],
    actions: (
      <>
        {missingTenant && (
          <PrimaryAction className="w-full py-2.5" onClick={() => setTenantDialog(true)}>
            <UserPlus className="h-4 w-4" />
            Ajouter le locataire
          </PrimaryAction>
        )}
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
            label: "Paiement du loyer",
            value: isCommercial
              ? commercialPaymentText(terms, bail.paymentDay)
              : bail.paymentDay
                ? `Le ${bail.paymentDay} de chaque mois`
                : null,
          },
        ],
      },
      {
        id: "argent",
        title: "Loyer et charges",
        icon: Euro,
        fields: [
          { label: `Loyer mensuel${ht}`, value: formatCurrency(bail.rentAmount) },
          ...(isCommercial
            ? [
                {
                  label: "Loyer annuel HT",
                  value: bail.rentAmount ? formatCurrency(bail.rentAmount * 12) : null,
                },
                { label: "TVA", value: commercialVatText(terms) },
              ]
            : []),
          {
            label: isCommercial ? "Provision mensuelle pour charges" : "Charges mensuelles",
            value: bail.monthlyCharges > 0 ? formatCurrency(bail.monthlyCharges) : null,
          },
          {
            label: "Dépôt de garantie",
            value: bail.securityDeposit > 0 ? formatCurrency(bail.securityDeposit) : null,
          },
          {
            label: `Total mensuel${ht}`,
            value: bail.monthlyCharges > 0 ? formatCurrency(totalMonthly) : null,
          },
        ],
      },
      // Bail commercial : les réponses du formulaire, telles que transmises au notaire.
      ...(commercialRows.length > 0
        ? [
            {
              id: "conditions-commerciales",
              title: "Conditions du bail commercial",
              icon: Store,
              fields: commercialRows.map(([label, value]) => ({ label, value, wide: true })),
            },
          ]
        : []),
      // La section paraît même sans locataire : « Non renseigné » dit ce qui
      // manque, là où l'absence de section laissait croire à un oubli.
      ...(tenantName || missingTenant
        ? [
            {
              id: "locataire",
              title: "Le locataire",
              icon: UserRound,
              fields: [
                { label: "Nom", value: tenantName ?? "Non renseigné" },
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
      // L'interlocuteur du dossier, nommé : « Discuter avec le notaire »
      // n'apprenait pas avec qui.
      ...(hasNotaire
        ? [
            {
              id: "notaire",
              title: "Votre notaire",
              icon: Scale,
              fields: [
                { label: "Notaire en charge", value: notaireName ?? "Notaire assigné" },
              ],
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
      ...(missingRentProofs.length > 0
        ? [
            {
              id: "justificatifs-loyer",
              title: `Justificatifs du loyer à fournir · ${missingRentProofs.length}`,
              icon: Scale,
              node: <RentProofUploads bailId={bail.id} kinds={missingRentProofs} />,
            },
          ]
        : []),
      // Toujours présente : le propriétaire retrouve ici les pièces du bien et du bail.
      {
        id: "pieces",
        title: `Pièces du dossier · ${bail.documents.length + (bail.propertyDocuments?.length ?? 0)}`,
        icon: FileText,
        node: (
          <DossierDocuments
            propertyDocuments={bail.propertyDocuments ?? []}
            bailDocuments={bail.documents}
          />
        ),
      },
    ],
  };

  return (
    <>
      <SubPageBar backHref={model.backHref} trail={model.trail} />
      <DetailVariant variant="rail" model={model} chrome={false} />
      {/* Le même dialogue que la liste : une seule logique d'ajout. */}
      <AddTenantDialog bailId={bail.id} open={tenantDialog} onOpenChange={setTenantDialog} />
    </>
  );
}

/** Dépôt des justificatifs du loyer manquants ; la page se met à jour après chaque envoi. */
function RentProofUploads({ bailId, kinds }: { bailId: string; kinds: string[] }) {
  const router = useRouter();
  const [files, setFiles] = React.useState<Record<string, File | null>>({});
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Le logement est en zone tendue : ces pièces prouvent que le loyer respecte les règles de relocation. Notre équipe en a besoin avant
        l&apos;envoi au notaire.
      </p>
      {kinds.map((kind) => (
        <div key={kind} className="space-y-1">
          <FileUpload
            label={PROOF_LABELS[kind]?.label ?? kind}
            multiple
            value={files[kind] ?? null}
            onChange={(file) => setFiles((prev) => ({ ...prev, [kind]: file }))}
            documentBailId={bailId}
            documentKind={kind}
            onUploadsComplete={() => router.refresh()}
          />
          <p className="text-xs text-muted-foreground">{PROOF_LABELS[kind]?.hint}</p>
        </div>
      ))}
    </div>
  );
}
