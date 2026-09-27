"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Home,
  Loader2,
  MessageSquare,
  Store,
  UserPlus,
  UserRound,
} from "lucide-react";
import { BailFamille, BailType, ProfilType } from "@prisma/client";
import { toast } from "sonner";

import { createTenantForLease } from "@/lib/actions/leases";
import { cn } from "@/lib/utils";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { formatDate } from "@/lib/utils/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { useOwnerRuntime } from "./owner-runtime";
import { Avatar, IconTile, Pill, PrimaryAction, QuietAction, Stepper, Surface, Tone } from "./owner-ui";

/* =========================================================================
   La carte d'un bail — remplaçante directe de `OwnerBailCard`.

   Mêmes props, même logique (locataire manquant, date de fin calculée,
   messages de statut, chat notaire, ouverture du détail). Ce qui change :
   l'état du dossier se lit dans l'en-tête sous forme de pastille, la frise
   passe sous les métadonnées, et les deux actions vivent dans un pied de
   carte clairement séparé.
   ========================================================================= */

export type OwnerBailCardData = {
  id: string;
  bailType?: string | null;
  bailFamily?: string | null;
  status: string;
  rentAmount?: number | null;
  effectiveDate?: string | Date | null;
  endDate?: string | Date | null;
  property: { id: string; label: string | null; fullAddress: string | null };
  parties?: Array<{
    id: string;
    profilType: string;
    persons?: Array<{ firstName: string | null; lastName: string | null; email?: string | null }>;
    entreprise?: { legalName: string | null; name: string | null; email?: string | null } | null;
  }>;
  dossierAssignments?: Array<{
    id?: string;
    notaire: { id?: string; name: string | null; email: string | null } | null;
  }>;
};

const STEPS = ["Vérification", "Notaire", "Signé"] as const;

const STEP_INDEX: Record<string, number> = {
  AWAITING_TENANT: 0,
  AWAITING_TENANT_FORM: 0,
  PENDING_VALIDATION: 0,
  READY_FOR_NOTARY: 1,
  CLIENT_CONTACTED: 1,
  SIGNED: 2,
  TERMINATED: 2,
  DESISTE: 2,
  CLASSE_SANS_SUITE: 2,
};

const TERMINAL_STATUSES = ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"];

const STATUS_MESSAGES: Record<string, string> = {
  AWAITING_TENANT_FORM:
    "En attente des informations du locataire. Le lien lui a bien été envoyé par email.",
  PENDING_VALIDATION: "Votre dossier est entre nos mains. On revient vers vous sous 48h.",
  READY_FOR_NOTARY: "Un notaire a pris en charge votre dossier. Il va vous contacter prochainement.",
  CLIENT_CONTACTED:
    "Votre dossier avance avec votre notaire. Vous êtes désormais en contact pour préparer ensemble les prochaines étapes jusqu'à la signature.",
  SIGNED: "Félicitations ! Votre bail a été signé avec succès.",
  TERMINATED: "Ce bail est terminé.",
  DESISTE: "Ce dossier a fait l'objet d'un désistement.",
  CLASSE_SANS_SUITE: "Ce dossier a été classé sans suite.",
};

/** L'état du dossier en deux mots, pour le lire sans dérouler la carte. */
const STATUS_PILLS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Brouillon", tone: "slate" },
  AWAITING_TENANT: { label: "Locataire à ajouter", tone: "amber" },
  AWAITING_TENANT_FORM: { label: "Locataire en cours", tone: "blue" },
  PENDING_VALIDATION: { label: "En vérification", tone: "blue" },
  READY_FOR_NOTARY: { label: "Chez le notaire", tone: "violet" },
  CLIENT_CONTACTED: { label: "Avec votre notaire", tone: "violet" },
  SIGNED: { label: "Signé", tone: "emerald" },
  TERMINATED: { label: "Terminé", tone: "slate" },
  DESISTE: { label: "Désisté", tone: "slate" },
  CLASSE_SANS_SUITE: { label: "Classé", tone: "slate" },
};

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

function formatRent(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getTenantName(parties: OwnerBailCardData["parties"]) {
  const tenant = parties?.find((party) => party.profilType === ProfilType.LOCATAIRE);
  if (!tenant) return null;
  if (tenant.entreprise) return tenant.entreprise.legalName || tenant.entreprise.name || "Entreprise";
  const person = tenant.persons?.[0];
  if (!person) return null;
  return `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.email || null;
}

function Meta({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function OwnerBailCardV2({
  bail,
  context,
  detailHref,
  onViewDetail,
}: {
  bail: OwnerBailCardData;
  context: "dashboard" | "dossiers";
  detailHref?: string;
  onViewDetail?: () => void;
}) {
  const router = useRouter();
  const { demo } = useOwnerRuntime();
  const [tenantDialogOpen, setTenantDialogOpen] = React.useState(false);
  const [tenantEmail, setTenantEmail] = React.useState("");
  const [isAddingTenant, setIsAddingTenant] = React.useState(false);

  const tenantName = getTenantName(bail.parties);
  const missingTenant = bail.status === "AWAITING_TENANT" && !tenantName;
  const notaire = bail.dossierAssignments?.[0]?.notaire ?? null;
  const isCommercial = bail.bailFamily === BailFamille.COMMERCIAL;
  const isSigned = bail.status === "SIGNED";
  const terminal = TERMINAL_STATUSES.includes(bail.status);
  const familyLabel = isCommercial ? "Bail commercial" : "Bail d'habitation";
  const propertyLabel =
    bail.property.label || bail.property.fullAddress?.split(",")[0] || "Bien immobilier";
  const propertyDescription =
    bail.property.label && bail.property.fullAddress
      ? `${bail.property.label} — ${bail.property.fullAddress}`
      : bail.property.fullAddress || propertyLabel;

  const calculatedEndDate =
    bail.endDate ||
    (bail.effectiveDate && bail.bailType
      ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType)
      : null);

  const message = STATUS_MESSAGES[bail.status];
  const statusPill = STATUS_PILLS[bail.status];
  const showChat = Boolean(notaire);

  const handleAddTenant = async () => {
    if (!tenantEmail.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    try {
      setIsAddingTenant(true);
      if (demo) {
        await new Promise((resolve) => setTimeout(resolve, 450));
      } else {
        await createTenantForLease({ bailId: bail.id, email: tenantEmail });
      }
      toast.success("Locataire ajouté — un email lui a été envoyé");
      setTenantDialogOpen(false);
      setTenantEmail("");
      if (!demo) router.refresh();
    } catch (error: any) {
      toast.error("Erreur", { description: error?.message });
    } finally {
      setIsAddingTenant(false);
    }
  };

  return (
    <>
      <Surface tone="raised" className="overflow-hidden">
        <div className="space-y-3.5 p-4 sm:p-5">
          {/* En-tête : nature du bail, bien, état */}
          <div className="flex items-start gap-3">
            <IconTile
              icon={isSigned ? FileCheck2 : isCommercial ? Store : Home}
              tone={isSigned ? "emerald" : isCommercial ? "amber" : "blue"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-tight tracking-tight text-slate-900">
                {familyLabel}
              </p>
              {context === "dashboard" && (
                <p className="mt-0.5 truncate text-[12px] text-slate-500" title={propertyDescription}>
                  {propertyDescription}
                </p>
              )}
            </div>
            {statusPill && (
              <Pill tone={statusPill.tone} className="mt-0.5 shrink-0">
                {statusPill.label}
              </Pill>
            )}
          </div>

          {/* Métadonnées : loyer, type, période */}
          {(bail.rentAmount || bail.bailType || bail.effectiveDate) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-slate-100 py-2.5">
              {bail.rentAmount != null && bail.rentAmount > 0 && (
                <span className="text-[14px] font-bold tabular-nums tracking-tight text-slate-900">
                  {formatRent(bail.rentAmount)}
                  <span className="ml-0.5 text-[11px] font-medium text-slate-400">/mois</span>
                </span>
              )}
              {bail.bailType && <Meta icon={FileText}>{BAIL_TYPE_LABELS[bail.bailType] || bail.bailType}</Meta>}
              {bail.effectiveDate && (
                <Meta icon={CalendarDays}>
                  <span className="inline-flex items-center gap-1">
                    {formatDate(bail.effectiveDate)}
                    {calculatedEndDate && (
                      <>
                        <ArrowRight className="h-2.5 w-2.5 shrink-0 text-slate-300" />
                        {formatDate(calculatedEndDate)}
                      </>
                    )}
                  </span>
                </Meta>
              )}
            </div>
          )}

          {/* Locataire */}
          {missingTenant ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#4373f5]/20 bg-[#4373f5]/[0.045] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-slate-800">Locataire à renseigner</p>
                <p className="text-[11.5px] leading-snug text-slate-500">
                  Ajoutez-le dès que vous l&apos;avez trouvé — le dossier continue sans lui.
                </p>
              </div>
              <PrimaryAction className="px-3 py-2 text-[12.5px]" onClick={() => setTenantDialogOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Ajouter
              </PrimaryAction>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {tenantName ? (
                <Avatar label={tenantName} />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <UserRound className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-slate-400">
                  Locataire
                </p>
                <p
                  className={cn(
                    "mt-0.5 truncate text-[13.5px] font-medium text-slate-800",
                    !tenantName && "text-[12.5px] font-normal italic text-slate-400",
                  )}
                >
                  {tenantName ?? "Non renseigné"}
                </p>
              </div>
            </div>
          )}

          {/* Avancement */}
          {!terminal && <Stepper steps={STEPS} index={STEP_INDEX[bail.status] ?? 0} className="pt-0.5" />}

          {/* Où en est le dossier, en une phrase */}
          {message && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px] leading-snug",
                isSigned ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600",
              )}
            >
              {isSigned ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Pied de carte : les deux seules actions possibles */}
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {showChat &&
            (demo ? (
              <PrimaryAction
                className="flex-1"
                onClick={() => toast.info("Aperçu — la messagerie du notaire s'ouvre ici")}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Contacter le notaire
              </PrimaryAction>
            ) : (
              <BailChatSheet
                bailId={bail.id}
                trigger={
                  <PrimaryAction className="flex-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Contacter le notaire
                  </PrimaryAction>
                }
              />
            ))}
          {detailHref && !demo ? (
            <Link
              href={detailHref}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50",
                !showChat && "w-full",
              )}
            >
              Voir le dossier
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <QuietAction
              className={cn("py-2.5", !showChat && "w-full")}
              onClick={
                onViewDetail ??
                (() => toast.info("Aperçu — le détail du dossier s'ouvre ici"))
              }
            >
              Voir le dossier
              <ArrowRight className="h-3.5 w-3.5" />
            </QuietAction>
          )}
        </div>
      </Surface>

      {/* Ajout d'un locataire — dialogue inchangé, habillage aligné */}
      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px] tracking-tight">
              <UserPlus className="h-4.5 w-4.5 text-[#3563e9]" />
              Ajouter un locataire
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug">
              Entrez l&apos;adresse email de votre locataire. Il recevra un lien pour compléter son dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-[12.5px]">Email *</Label>
            <Input
              type="email"
              placeholder="locataire@example.com"
              value={tenantEmail}
              onChange={(event) => setTenantEmail(event.target.value)}
              disabled={isAddingTenant}
              inputMode="email"
              autoComplete="email"
              className="h-11 rounded-xl"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAddTenant();
              }}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <PrimaryAction
              onClick={handleAddTenant}
              disabled={isAddingTenant || !tenantEmail}
              className="w-full py-3"
            >
              {isAddingTenant ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Ajouter le locataire
                </>
              )}
            </PrimaryAction>
            <QuietAction
              className="w-full py-3"
              disabled={isAddingTenant}
              onClick={() => {
                setTenantDialogOpen(false);
                setTenantEmail("");
              }}
            >
              Annuler
            </QuietAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------- Variante compacte, pour le tableau de bord -------------------- */

/**
 * Sur le tableau de bord, un dossier se consulte, il ne se travaille pas :
 * la question est « où en est-il ? », pas « que dois-je remplir ? » — cela
 * vit dans « À faire maintenant », juste au-dessus. Une ligne suffit donc,
 * et quatre dossiers tiennent dans un écran au lieu de quatre défilements.
 *
 * Rien n'est perdu au passage : la messagerie du notaire reste accessible
 * d'ici quand un notaire est assigné, et la ligne entière ouvre le dossier.
 */
export function OwnerBailRow({
  bail,
  href,
  onOpen,
}: {
  bail: OwnerBailCardData;
  href?: string;
  onOpen?: () => void;
}) {
  const { demo } = useOwnerRuntime();
  const isCommercial = bail.bailFamily === BailFamille.COMMERCIAL;
  const isSigned = bail.status === "SIGNED";
  const terminal = TERMINAL_STATUSES.includes(bail.status);
  const statusPill = STATUS_PILLS[bail.status];
  const stepIndex = STEP_INDEX[bail.status] ?? 0;
  const notaire = bail.dossierAssignments?.[0]?.notaire ?? null;
  const tenantName = getTenantName(bail.parties);
  const propertyLabel =
    bail.property.label || bail.property.fullAddress?.split(",")[0] || "Bien immobilier";

  const summary = [
    bail.rentAmount != null && bail.rentAmount > 0 ? `${formatRent(bail.rentAmount)}/mois` : null,
    bail.bailType ? BAIL_TYPE_LABELS[bail.bailType] || bail.bailType : null,
    tenantName,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      <IconTile
        icon={isSigned ? FileCheck2 : isCommercial ? Store : Home}
        tone={isSigned ? "emerald" : isCommercial ? "amber" : "blue"}
      />
      <span className="min-w-0 flex-1">
        {/* Le titre occupe sa ligne entière : sur un téléphone, une pastille
            posée à côté de lui le réduisait à trois mots suivis de points. */}
        <span className="block truncate text-[13.5px] font-semibold tracking-tight text-slate-900">
          {propertyLabel}
        </span>
        {summary && <span className="mt-0.5 block truncate text-[12px] text-slate-500">{summary}</span>}
        <span className="mt-2 flex items-center gap-2">
          {!terminal && (
            <span className="flex w-[104px] shrink-0 items-center gap-1">
              {STEPS.map((step, index) => (
                <span
                  key={step}
                  title={step}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    // Un dossier signé est vert de bout en bout : le bleu de
                    // l'étape en cours n'a plus lieu d'être une fois arrivé.
                    isSigned || stepIndex > index
                      ? "bg-emerald-400"
                      : stepIndex === index
                        ? "bg-[#4373f5]"
                        : "bg-slate-200",
                  )}
                />
              ))}
            </span>
          )}
          {statusPill && <Pill tone={statusPill.tone}>{statusPill.label}</Pill>}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex items-center gap-2 pr-3">
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-start gap-3 p-4 transition-colors hover:bg-slate-50/70">
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50/70"
        >
          {body}
        </button>
      )}

      {notaire &&
        (demo ? (
          <button
            type="button"
            title="Contacter le notaire"
            onClick={() => toast.info("Aperçu — la messagerie du notaire s'ouvre ici")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4373f5]/10 text-[#3563e9] transition-colors hover:bg-[#4373f5]/15"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="sr-only">Contacter le notaire</span>
          </button>
        ) : (
          <BailChatSheet
            bailId={bail.id}
            trigger={
              <button
                type="button"
                title="Contacter le notaire"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4373f5]/10 text-[#3563e9] transition-colors hover:bg-[#4373f5]/15"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="sr-only">Contacter le notaire</span>
              </button>
            }
          />
        ))}

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </div>
  );
}
