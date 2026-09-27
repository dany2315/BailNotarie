"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Loader2,
  MessageSquare,
  ScanSearch,
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
import { IconTile, MicroLabel, Pill, PrimaryAction, QuietAction, Surface, Tone } from "./owner-ui";

/* =========================================================================
   La carte d'un dossier — remplaçante directe de `OwnerBailCard`.

   Le premier jet gardait l'ordre de l'ancienne carte : la nature du bail en
   titre, puis des pastilles, le locataire, la frise, un encadré de message.
   Six strates, et l'état du dossier répété trois fois (pastille, libellés de
   la frise, phrase). Or la question d'un propriétaire tient en une ligne :
   « où en est-il, et dois-je faire quelque chose ? »

   Donc l'état devient le titre, en une phrase courte ; la frise se réduit à
   trois segments (elle situe, elle n'explique plus — le titre s'en charge) ;
   et ce qui identifie le bail (loyer, type, période, locataire) descend en
   bloc d'étiquettes, dans la même écriture que « Mes informations ». Une
   carte, une question, une réponse.

   Toute la logique est conservée : locataire manquant et son ajout, date de
   fin calculée quand elle n'est pas stockée, messagerie du notaire, détail.
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

/**
 * L'état d'un dossier, dit une seule fois : un titre de trois mots, une
 * phrase courte, une couleur, une icône. Les textes longs de l'ancienne
 * carte disaient la même chose en trois lignes — ils restent disponibles
 * dans le tiroir de détail, qui a la place de les porter.
 */
const STATUS_VIEW: Record<
  string,
  { title: string; note?: string; tone: Tone; icon: React.ElementType }
> = {
  DRAFT: { title: "Brouillon", tone: "slate", icon: FileText },
  AWAITING_TENANT: {
    title: "Locataire à ajouter",
    note: "Ajoutez-le dès que vous l'avez trouvé — le dossier avance sans lui.",
    tone: "amber",
    icon: UserPlus,
  },
  AWAITING_TENANT_FORM: {
    title: "En attente du locataire",
    note: "Le lien lui a bien été envoyé par email.",
    tone: "blue",
    icon: Clock,
  },
  PENDING_VALIDATION: {
    title: "En vérification",
    note: "Votre dossier est entre nos mains. On revient vers vous sous 48 h.",
    tone: "blue",
    icon: ScanSearch,
  },
  READY_FOR_NOTARY: {
    title: "Chez le notaire",
    note: "Un notaire a pris votre dossier en charge. Il vous contacte bientôt.",
    tone: "violet",
    icon: FileText,
  },
  CLIENT_CONTACTED: {
    title: "Avec votre notaire",
    note: "Vous préparez ensemble la signature.",
    tone: "violet",
    icon: MessageSquare,
  },
  SIGNED: {
    title: "Signé",
    note: "Votre bail a été signé. Félicitations !",
    tone: "emerald",
    icon: FileCheck2,
  },
  TERMINATED: { title: "Terminé", tone: "slate", icon: FileText },
  DESISTE: { title: "Désistement", tone: "slate", icon: FileText },
  CLASSE_SANS_SUITE: { title: "Classé sans suite", tone: "slate", icon: FileText },
};

const FALLBACK_VIEW = { title: "En cours", tone: "slate" as Tone, icon: Clock };

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

/** Ce qui identifie le bail, calculé une fois pour la carte et pour la ligne. */
function useBailFacts(bail: OwnerBailCardData) {
  const view = STATUS_VIEW[bail.status] ?? FALLBACK_VIEW;
  const tenantName = getTenantName(bail.parties);
  const isCommercial = bail.bailFamily === BailFamille.COMMERCIAL;
  const endDate =
    bail.endDate ||
    (bail.effectiveDate && bail.bailType
      ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType)
      : null);

  return {
    view,
    tenantName,
    isCommercial,
    endDate,
    terminal: TERMINAL_STATUSES.includes(bail.status),
    stepIndex: STEP_INDEX[bail.status] ?? 0,
    notaire: bail.dossierAssignments?.[0]?.notaire ?? null,
    rent: bail.rentAmount != null && bail.rentAmount > 0 ? formatRent(bail.rentAmount) : null,
    typeLabel: bail.bailType
      ? BAIL_TYPE_LABELS[bail.bailType] || bail.bailType
      : isCommercial
        ? "Bail commercial"
        : null,
    propertyLabel:
      bail.property.label || bail.property.fullAddress?.split(",")[0] || "Bien immobilier",
    propertyDescription:
      bail.property.label && bail.property.fullAddress
        ? `${bail.property.label} — ${bail.property.fullAddress}`
        : bail.property.fullAddress || bail.property.label || "Bien immobilier",
  };
}

/* ---------- Atomes partagés ------------------------------------------------ */

/** Trois segments : ils situent le dossier, ils ne l'expliquent plus. */
function StepBar({
  stepIndex,
  signed,
  className,
}: {
  stepIndex: number;
  signed: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", className)}>
      {STEPS.map((step, index) => (
        <span
          key={step}
          title={step}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-500",
            signed || stepIndex > index
              ? "bg-emerald-400"
              : stepIndex === index
                ? "bg-[#4373f5]"
                : "bg-slate-200",
          )}
        />
      ))}
    </span>
  );
}

/** Étiquette + valeur, dans l'écriture de « Mes informations ». */
function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <MicroLabel className="mb-0.5">{label}</MicroLabel>
      <p className="truncate text-[13px] font-medium text-slate-800">{value}</p>
    </div>
  );
}

/* ---------- La carte ------------------------------------------------------- */

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

  const facts = useBailFacts(bail);
  const missingTenant = bail.status === "AWAITING_TENANT" && !facts.tenantName;
  const showChat = Boolean(facts.notaire);
  const period =
    bail.effectiveDate &&
    `${formatDate(bail.effectiveDate)}${facts.endDate ? ` → ${formatDate(facts.endDate)}` : ""}`;

  const handleAddTenant = async () => {
    if (!tenantEmail.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    try {
      setIsAddingTenant(true);
      if (demo) await new Promise((resolve) => setTimeout(resolve, 450));
      else await createTenantForLease({ bailId: bail.id, email: tenantEmail });
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
      <Surface tone="raised" className="overflow-hidden transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_34px_70px_-34px_rgba(30,58,138,0.4)]">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {/* 1. Où en est le dossier — la seule chose écrite en grand. */}
          <div className="flex items-start gap-3">
            <IconTile icon={facts.view.icon} tone={facts.view.tone} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight tracking-tight text-slate-900">
                {facts.view.title}
              </p>
              {context === "dashboard" && (
                <p className="mt-0.5 truncate text-[12px] text-slate-500" title={facts.propertyDescription}>
                  {facts.propertyDescription}
                </p>
              )}
              {facts.view.note && (
                <p className="mt-1 text-[12.5px] leading-snug text-slate-500">{facts.view.note}</p>
              )}
            </div>
            {missingTenant && (
              <PrimaryAction className="hidden shrink-0 sm:inline-flex" onClick={() => setTenantDialogOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Ajouter
              </PrimaryAction>
            )}
          </div>

          {/* 2. Le chemin parcouru. */}
          {!facts.terminal && (
            <StepBar stepIndex={facts.stepIndex} signed={bail.status === "SIGNED"} />
          )}

          {/* 3. Ce qui identifie ce bail. */}
          <div className="flex flex-wrap gap-x-7 gap-y-3 border-t border-slate-100 pt-3.5">
            <Fact label="Loyer" value={facts.rent ? `${facts.rent} / mois` : null} />
            <Fact label="Bail" value={facts.typeLabel} />
            <Fact label="Période" value={period || null} />
            {!missingTenant && <Fact label="Locataire" value={facts.tenantName ?? "Non renseigné"} />}
          </div>

          {/* Sur téléphone, le geste passe sous le texte plutôt que de se
              comprimer à côté du titre. */}
          {missingTenant && (
            <PrimaryAction className="w-full py-3 sm:hidden" onClick={() => setTenantDialogOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Ajouter le locataire
            </PrimaryAction>
          )}
        </div>

        {/* 4. Les actions, à part. */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center">
          {showChat &&
            (demo ? (
              <PrimaryAction
                className="w-full py-2.5 sm:flex-1"
                onClick={() => toast.info("Aperçu — la messagerie du notaire s'ouvre ici")}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Contacter le notaire
              </PrimaryAction>
            ) : (
              <BailChatSheet
                bailId={bail.id}
                trigger={
                  <PrimaryAction className="w-full py-2.5 sm:flex-1">
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
                "inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/40",
                showChat && "sm:w-auto",
              )}
            >
              Voir le dossier
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <QuietAction
              className={cn("w-full py-2.5", showChat && "sm:w-auto")}
              onClick={onViewDetail ?? (() => toast.info("Aperçu — le détail du dossier s'ouvre ici"))}
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
              <UserPlus className="h-4 w-4 text-[#3563e9]" />
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
 * ce qui demande une action vit dans « À faire maintenant », juste au-dessus.
 * Une ligne suffit donc, et quatre dossiers tiennent dans un écran au lieu de
 * quatre défilements. La messagerie du notaire reste accessible d'ici, et la
 * ligne entière ouvre le dossier.
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
  const facts = useBailFacts(bail);

  const summary = [facts.rent ? `${facts.rent}/mois` : null, facts.typeLabel, facts.tenantName]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      <IconTile icon={facts.view.icon} tone={facts.view.tone} />
      <span className="min-w-0 flex-1">
        {/* Le titre occupe sa ligne entière : sur un téléphone, une pastille
            posée à côté de lui le réduisait à trois mots suivis de points. */}
        <span className="block truncate text-[13.5px] font-semibold tracking-tight text-slate-900">
          {facts.propertyLabel}
        </span>
        {summary && <span className="mt-0.5 block truncate text-[12px] text-slate-500">{summary}</span>}
        <span className="mt-2 flex items-center gap-2">
          {!facts.terminal && (
            <StepBar
              stepIndex={facts.stepIndex}
              signed={bail.status === "SIGNED"}
              className="w-[104px] shrink-0"
            />
          )}
          <Pill tone={facts.view.tone}>{facts.view.title}</Pill>
        </span>
      </span>
    </>
  );

  return (
    <div className="flex items-center gap-2 pr-3">
      {href ? (
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-start gap-3 p-4 transition-colors hover:bg-slate-50/70"
        >
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

      {facts.notaire &&
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
