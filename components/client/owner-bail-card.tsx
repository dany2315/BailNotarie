"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Home,
  Loader2,
  MessageSquare,
  Store,
  User,
  UserPlus,
} from "lucide-react";
import { BailFamille, BailType, ProfilType } from "@prisma/client";
import { toast } from "sonner";

import { createTenantForLease } from "@/lib/actions/leases";
import { cn } from "@/lib/utils";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { formatDate } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export type OwnerBailCardData = {
  id: string;
  bailType?: string | null;
  bailFamily?: string | null;
  status: string;
  rentAmount?: number | null;
  effectiveDate?: string | Date | null;
  endDate?: string | Date | null;
  property: {
    id: string;
    label: string | null;
    fullAddress: string | null;
  };
  parties?: Array<{
    id: string;
    profilType: string;
    persons?: Array<{
      firstName: string | null;
      lastName: string | null;
      email?: string | null;
    }>;
    entreprise?: {
      legalName: string | null;
      name: string | null;
      email?: string | null;
    } | null;
  }>;
  dossierAssignments?: Array<{
    id?: string;
    notaire: {
      id?: string;
      name: string | null;
      email: string | null;
    } | null;
  }>;
};

type OwnerBailCardProps = {
  bail: OwnerBailCardData;
  context: "dashboard" | "dossiers";
  detailHref?: string;
  onViewDetail?: () => void;
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
  PENDING_VALIDATION:
    "Votre dossier est entre nos mains. On revient vers vous sous 48h.",
  READY_FOR_NOTARY:
    "Un notaire a pris en charge votre dossier. Il va vous contacter prochainement.",
  CLIENT_CONTACTED:
    "Votre dossier avance avec votre notaire. Vous êtes désormais en contact pour préparer ensemble les prochaines étapes jusqu'à la signature.",
  SIGNED: "Félicitations ! Votre bail a été signé avec succès.",
  TERMINATED: "Ce bail est terminé.",
  DESISTE: "Ce dossier a fait l'objet d'un désistement.",
  CLASSE_SANS_SUITE: "Ce dossier a été classé sans suite.",
};

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTenantName(parties: OwnerBailCardData["parties"]) {
  const tenant = parties?.find((party) => party.profilType === ProfilType.LOCATAIRE);
  if (!tenant) return null;
  if (tenant.entreprise) {
    return tenant.entreprise.legalName || tenant.entreprise.name || "Entreprise";
  }
  const person = tenant.persons?.[0];
  if (!person) return null;
  return (
    `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
    person.email ||
    null
  );
}

function BailTimeline({ status }: { status: string }) {
  const stepIndex = STEP_INDEX[status] ?? 0;
  const terminal = TERMINAL_STATUSES.includes(status);

  if (terminal) return null;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <div className="absolute inset-x-0 top-[5px] h-px bg-border" />
        <div className="flex justify-between">
          {STEPS.map((step, index) => {
            const done = stepIndex > index;
            const active = stepIndex === index;
            return (
              <div
                key={step}
                className={cn(
                  "relative z-10 h-2.5 w-2.5 rounded-full transition-all",
                  done
                    ? "bg-primary"
                    : active
                      ? "bg-primary ring-[3px] ring-primary/20"
                      : "bg-border"
                )}
              />
            );
          })}
        </div>
      </div>
      <div className="relative flex justify-between">
        {STEPS.map((step, index) => {
          const done = stepIndex > index;
          const active = stepIndex === index;
          const color = active
            ? "font-semibold text-primary"
            : done
              ? "text-primary/50"
              : "text-muted-foreground/50";
          return (
            <p
              key={step}
              className={cn(
                "text-[9px]",
                index === 1 && "absolute left-1/2 -translate-x-1/2 text-center",
                index === 2 && "text-right",
                color
              )}
            >
              {step}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export function OwnerBailCard({
  bail,
  context,
  detailHref,
  onViewDetail,
}: OwnerBailCardProps) {
  const router = useRouter();
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [tenantEmail, setTenantEmail] = useState("");
  const [isAddingTenant, setIsAddingTenant] = useState(false);

  const tenantName = getTenantName(bail.parties);
  const missingTenant = bail.status === "AWAITING_TENANT" && !tenantName;
  const notaire = bail.dossierAssignments?.[0]?.notaire ?? null;
  const isCommercial = bail.bailFamily === BailFamille.COMMERCIAL;
  const isSigned = bail.status === "SIGNED";
  const isContacted = bail.status === "CLIENT_CONTACTED";
  const terminal = TERMINAL_STATUSES.includes(bail.status);
  const familyLabel = isCommercial ? "Bail commercial" : "Bail d'habitation";
  const propertyLabel =
    bail.property.label ||
    bail.property.fullAddress?.split(",")[0] ||
    "Bien immobilier";
  const propertyDescription =
    bail.property.label && bail.property.fullAddress
      ? `${bail.property.label} — ${bail.property.fullAddress}`
      : bail.property.fullAddress || propertyLabel;
  const tenantInitial =
    tenantName?.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() ||
    "?";

  const calculatedEndDate =
    bail.endDate ||
    (bail.effectiveDate && bail.bailType
      ? calculateBailEndDate(
          new Date(bail.effectiveDate),
          bail.bailType as BailType
        )
      : null);

  const message = STATUS_MESSAGES[bail.status];
  const showChat = Boolean(notaire);

  const handleAddTenant = async () => {
    if (!tenantEmail.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    try {
      setIsAddingTenant(true);
      await createTenantForLease({ bailId: bail.id, email: tenantEmail });
      toast.success("Locataire ajouté — un email lui a été envoyé");
      setTenantDialogOpen(false);
      setTenantEmail("");
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    } finally {
      setIsAddingTenant(false);
    }
  };

  const detailAction = detailHref ? (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn(
        "gap-1.5 text-primary hover:bg-primary/5 hover:text-primary/80",
        !showChat && "w-full"
      )}
    >
      <Link href={detailHref}>
        <ExternalLink className="h-3.5 w-3.5" />
        Voir le dossier
      </Link>
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "gap-1.5 text-primary hover:bg-primary/5 hover:text-primary/80",
        !showChat && "w-full"
      )}
      onClick={onViewDetail}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Voir le dossier
    </Button>
  );

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden border pt-0 pb-0 shadow-sm transition-shadow hover:shadow-md",
          isSigned && "ring-1 ring-green-300",
          isContacted && "ring-1 ring-blue-400"
        )}
      >
        <CardContent className="p-0">
          <div className="space-y-3.5 p-4">
            <div className="flex items-start gap-2 min-w-0">
              <div
                className={cn(
                  "mt-0.5 shrink-0 rounded-md p-1.5",
                  isSigned
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : isCommercial
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                )}
              >
                {isSigned ? (
                  <FileCheck2 className="h-3.5 w-3.5" />
                ) : isCommercial ? (
                  <Store className="h-3.5 w-3.5" />
                ) : (
                  <Home className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{familyLabel}</p>
                {context === "dashboard" && (
                  <p
                    className="mt-0.5 truncate text-xs text-muted-foreground"
                    title={propertyDescription}
                  >
                    {propertyDescription}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {bail.rentAmount != null && bail.rentAmount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {formatCurrency(bail.rentAmount)}/mois
                </span>
              )}
              {bail.bailType && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {BAIL_TYPE_LABELS[bail.bailType] || bail.bailType}
                </span>
              )}
              {bail.effectiveDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(bail.effectiveDate)}
                  {calculatedEndDate && (
                    <>
                      <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                      {formatDate(calculatedEndDate)}
                    </>
                  )}
                </span>
              )}
            </div>

            {missingTenant ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-950/40">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    <User className="h-3 w-3" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      Locataire
                    </span>
                    <span className="block text-xs italic text-blue-700 dark:text-blue-300">
                      Non renseigné
                    </span>
                    <span className="block text-[9px] leading-tight text-blue-700 dark:text-blue-300">
                      Vous pouvez l&apos;ajouter dès que vous l&apos;avez trouvé.
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 bg-blue-700 px-2.5 text-xs text-white hover:bg-blue-800"
                  onClick={() => setTenantDialogOpen(true)}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {tenantName ? tenantInitial : <User className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="mb-0.5 text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                    Locataire
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm",
                      !tenantName && "text-xs italic text-muted-foreground"
                    )}
                  >
                    {tenantName ?? "Non renseigné"}
                  </span>
                </div>
              </div>
            )}

            <BailTimeline status={bail.status} />

            {message && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm",
                  isSigned
                    ? "bg-green-50 text-green-800 dark:bg-green-950/60 dark:text-green-200"
                    : isContacted
                      ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                      : "bg-muted/70 text-muted-foreground"
                )}
              >
                {isSigned ? (
                  <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : isContacted ? (
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : terminal ? (
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span className="leading-snug">{message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-3">
            {showChat && (
              <BailChatSheet
                bailId={bail.id}
                trigger={
                  <Button size="sm" className="flex-1 gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Contacter le notaire
                  </Button>
                }
              />
            )}
            <div className={cn(!showChat && "w-full", showChat && "shrink-0")}>
              {detailAction}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ajouter un locataire
            </DialogTitle>
            <DialogDescription>
              Entrez l&apos;adresse email de votre locataire. Il recevra un lien pour compléter son dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="locataire@example.com"
              value={tenantEmail}
              onChange={(event) => setTenantEmail(event.target.value)}
              disabled={isAddingTenant}
              inputMode="email"
              autoComplete="email"
              className="h-11"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAddTenant();
              }}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleAddTenant}
              disabled={isAddingTenant || !tenantEmail}
              className="w-full"
            >
              {isAddingTenant ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter le locataire
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTenantDialogOpen(false);
                setTenantEmail("");
              }}
              disabled={isAddingTenant}
              className="w-full"
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
