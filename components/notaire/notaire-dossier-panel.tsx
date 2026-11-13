"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileText,
  FileUp,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { ComplementComposer } from "@/components/complements/complement-composer";
import { ComplementRequestsPanel } from "@/components/complements/complement-requests-panel";
import { NotaireBailChatSheet } from "@/components/notaire/notaire-bail-chat-sheet";
import { NotaireDiagnosticsCard } from "@/components/notaire/notaire-diagnostics";
import { useDownloadFile } from "@/hooks/use-download-file";
import { updateBailStatusByNotaire } from "@/lib/actions/notaires";
import { getBailStatusColor } from "@/lib/utils/bails-labels";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { copyToClipboard } from "@/lib/utils/copy";
import type {
  DossierDocument,
  FactSection,
  NotaireDossierView,
} from "@/lib/notaire/dossier-view";
import type { StaffComplementRequest } from "@/lib/actions/complement-requests";
import { cn } from "@/lib/utils";

type Target = "OWNER" | "TENANT";

const STATUS_OPTIONS = [
  "READY_FOR_NOTARY",
  "CLIENT_CONTACTED",
  "SIGNED",
  "DESISTE",
  "CLASSE_SANS_SUITE",
];

const dayFr = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });


/** Copie avec un retour visuel bref (« Copié »). */
function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.error("Copie impossible");
      return;
    }
    setCopied(key);
    window.setTimeout(
      () => setCopied((current) => (current === key ? null : current)),
      1600,
    );
  };
  return { copied, copy };
}

/**
 * Dossier du notaire : en haut ce qu'il fait le plus (tout télécharger, discuter, demander), puis les
 * données à reprendre dans l'acte, chacune copiable d'un clic, et les pièces rangées par personne.
 */
export function NotaireDossierPanel({
  view,
  requests,
}: {
  view: NotaireDossierView;
  requests: StaffComplementRequest[];
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(view.status);
  const [savingStatus, setSavingStatus] = React.useState(false);
  const [chat, setChat] = React.useState<{
    open: boolean;
    partyId: string | null;
  }>({ open: false, partyId: null });
  const [ask, setAsk] = React.useState<Target | null>(null);
  const { copied, copy } = useCopy();

  const owners = view.parties.filter((p) => p.role === "OWNER");
  const tenants = view.parties.filter((p) => p.role === "TENANT");
  const askable = (target: Target) =>
    view.parties.some((p) => p.role === target && p.askable);
  const statusColor = getBailStatusColor(status);
  const toReview = requests.filter((r) => r.status === "SUBMITTED").length;

  const changeStatus = async (next: string) => {
    if (!view.bailId || next === status) return;
    const previous = status;
    setStatus(next);
    setSavingStatus(true);
    try {
      await updateBailStatusByNotaire({ bailId: view.bailId, status: next });
      toast.success("Statut mis à jour");
      router.refresh();
    } catch {
      setStatus(previous);
      toast.error("Le statut n'a pas pu être changé");
    } finally {
      setSavingStatus(false);
    }
  };

  const partyLine = [
    owners.length > 0 &&
      `${owners.length > 1 ? "Propriétaires" : "Propriétaire"} : ${owners.map((p) => p.name).join(", ")}`,
    tenants.length > 0 &&
      `${tenants.length > 1 ? "Locataires" : "Locataire"} : ${tenants.map((p) => p.name).join(", ")}`,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
      {/* En-tête */}
      <header className="flex flex-col gap-4 rounded-2xl border bg-background p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {view.bailLabel && (
              <p className="text-[12.5px] font-medium text-muted-foreground">
                {view.bailLabel}
              </p>
            )}
            <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight sm:text-[24px]">
              {view.address}
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              {partyLine.join(" · ")}
            </p>
          </div>
          {view.bailId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 shrink-0 gap-2 self-start"
                  disabled={savingStatus}
                >
                  {savingStatus ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn("size-2 rounded-full", statusDot(status))}
                    />
                  )}
                  {statusColor.label}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Avancement du dossier
                </DropdownMenuLabel>
                {STATUS_OPTIONS.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={() => changeStatus(value)}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === status ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {getBailStatusColor(value).label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button asChild className="col-span-2 h-10 gap-2 sm:col-span-1">
            <a href={`/api/notaire/dossiers/${view.assignmentId}/zip`} download>
              <Download className="size-4" />
              Tout télécharger
              <span className="font-normal opacity-80">
                · {view.documentCount} pièce{view.documentCount > 1 ? "s" : ""}
              </span>
            </a>
          </Button>
          {view.bailId && (
            <PartyMenu
              label="Discuter"
              icon={<MessageSquare className="size-4" />}
              parties={view.parties}
              onPick={(party) => setChat({ open: true, partyId: party.id })}
            />
          )}
          {view.bailId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-2">
                  <FileUp className="size-4" />
                  Demander
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-60">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Pièces ou informations
                </DropdownMenuLabel>
                {(["OWNER", "TENANT"] as const)
                  .filter((target) =>
                    view.parties.some((p) => p.role === target),
                  )
                  .map((target) => (
                    <DropdownMenuItem
                      key={target}
                      disabled={!askable(target)}
                      onSelect={() => setAsk(target)}
                      className="flex-col items-start gap-0"
                    >
                      <span>
                        {target === "OWNER"
                          ? "Au propriétaire"
                          : "Au locataire"}
                      </span>
                      {!askable(target) && (
                        <span className="text-[11.5px] text-muted-foreground">
                          Son formulaire n&apos;est pas encore envoyé
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        {/* Données */}
        <div className="flex min-w-0 flex-col gap-5">
          {requests.length > 0 && (
            <section
              aria-labelledby="demandes-title"
              className="flex flex-col gap-3"
            >
              <h3
                id="demandes-title"
                className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
              >
                Mes demandes
                {toReview > 0 && (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[11.5px] normal-case tracking-normal text-blue-800">
                    {toReview} à vérifier
                  </span>
                )}
              </h3>
              <ComplementRequestsPanel requests={requests} />
            </section>
          )}

          {view.bail.length > 0 && (
            <FactGroup
              title="Le bail"
              sections={view.bail}
              copied={copied}
              copy={copy}
            />
          )}
          {view.property.length > 0 && (
            <FactGroup
              title="Le bien"
              sections={view.property}
              copied={copied}
              copy={copy}
            >
              {view.diagnostics && (
                <NotaireDiagnosticsCard diagnostics={view.diagnostics} />
              )}
            </FactGroup>
          )}
          {owners.map((party) => (
            <FactGroup
              key={party.id}
              title={owners.length > 1 ? "Propriétaire" : "Le propriétaire"}
              subtitle={party.kind}
              sections={party.sections}
              copied={copied}
              copy={copy}
            />
          ))}
          {tenants.map((party) => (
            <FactGroup
              key={party.id}
              title={tenants.length > 1 ? "Locataire" : "Le locataire"}
              subtitle={party.kind}
              sections={party.sections}
              copied={copied}
              copy={copy}
            />
          ))}
        </div>

        {/* Pièces */}
        <aside className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-5">
          <PiecesCard view={view} />
          {(view.notes || view.legacyRequests.length > 0) && (
            <section className="rounded-2xl border bg-background p-4">
              {view.notes && (
                <>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Note de l&apos;équipe
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed">
                    {view.notes}
                  </p>
                </>
              )}
              {view.legacyRequests.length > 0 && (
                <details
                  className={cn("group", view.notes && "mt-4 border-t pt-3")}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium text-muted-foreground hover:text-foreground">
                    Anciennes demandes · {view.legacyRequests.length}
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {view.legacyRequests.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <p className="text-[13px] font-medium">{r.title}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {dayFr(r.createdAt)} ·{" "}
                          {r.status === "COMPLETED"
                            ? "Terminée"
                            : r.status === "CANCELLED"
                              ? "Annulée"
                              : "En attente"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
          <p className="px-1 text-[12px] text-muted-foreground">
            Dossier confié le {dayFr(view.assignedAt)}
          </p>
        </aside>
      </div>

      {view.bailId && (
        <NotaireBailChatSheet
          bailId={view.bailId}
          dossierId={view.assignmentId}
          bailParties={view.chatParties as any}
          selectedPartyId={chat.partyId}
          open={chat.open}
          onOpenChange={(open) =>
            setChat((current) => ({
              open,
              partyId: open ? current.partyId : null,
            }))
          }
          onAsk={(target) => {
            setChat({ open: false, partyId: null });
            if (askable(target)) setAsk(target);
            else
              toast.info(
                "Son formulaire n'est pas encore envoyé : il demande déjà tout ce qui est obligatoire.",
              );
          }}
        />
      )}
      {view.bailId && ask && (
        <ComplementComposer
          bailId={view.bailId}
          target={ask}
          alsoTarget={
            askable(ask === "OWNER" ? "TENANT" : "OWNER")
              ? ask === "OWNER"
                ? "TENANT"
                : "OWNER"
              : undefined
          }
          open
          onOpenChange={(open) => !open && setAsk(null)}
        />
      )}
    </div>
  );
}

function statusDot(status: string) {
  return (
    (
      {
        READY_FOR_NOTARY: "bg-orange-500",
        CLIENT_CONTACTED: "bg-blue-500",
        SIGNED: "bg-emerald-500",
        DESISTE: "bg-red-500",
      } as Record<string, string>
    )[status] ?? "bg-slate-400"
  );
}

/** Bouton avec le choix de la personne (propriétaire ou locataire). */
function PartyMenu({
  label,
  icon,
  parties,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  parties: NotaireDossierView["parties"];
  onPick: (party: NotaireDossierView["parties"][number]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 gap-2">
          {icon}
          {label}
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {parties.map((party, index) => (
          <React.Fragment key={party.id}>
            {index > 0 && parties[index - 1].role !== party.role && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              onSelect={() => onPick(party)}
              className="flex-col items-start gap-0"
            >
              <span className="text-[11.5px] text-muted-foreground">
                {party.role === "OWNER" ? "Propriétaire" : "Locataire"}
              </span>
              <span>{party.name}</span>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Un groupe de données (« Le bail », « Le propriétaire »…) : une carte par bloc. */
function FactGroup({
  title,
  subtitle,
  sections,
  copied,
  copy,
  children,
}: {
  title: string;
  subtitle?: string;
  sections: FactSection[];
  copied: string | null;
  copy: (key: string, text: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
        {subtitle && (
          <span className="ml-2 font-normal normal-case tracking-normal">
            · {subtitle}
          </span>
        )}
      </h3>
      {sections.map((section) => (
        <article
          key={section.key}
          className="overflow-hidden rounded-2xl border bg-background"
        >
          <div className="border-b px-4 py-3 sm:px-5">
            <p className="truncate text-[15px] font-semibold">
              {section.title}
            </p>
            {section.hint && (
              <p className="text-[12px] text-muted-foreground">
                {section.hint}
              </p>
            )}
          </div>
          {section.rows.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-muted-foreground">
              Non renseigné
            </p>
          ) : (
            <dl className="divide-y">
              {section.rows.map((row, index) => {
                const key = `${section.key}:${index}`;
                const done = copied === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => copy(key, row.value)}
                    title={`Copier : ${row.value}`}
                    aria-label={`Copier ${row.label} : ${row.value}`}
                    className="group relative grid w-full grid-cols-1 gap-0.5 px-4 py-2.5 pr-14 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:grid-cols-[minmax(7rem,9.5rem)_minmax(0,1fr)] sm:items-baseline sm:gap-4 sm:px-5 sm:pr-14"
                  >
                    <dt className="text-[12.5px] text-muted-foreground sm:text-[13px]">
                      {row.label}
                    </dt>
                    <dd className="whitespace-pre-line break-words text-[14px] font-medium">
                      {row.value}
                    </dd>
                    {/* Icône toujours visible : chaque ligne se copie seule, d'un clic. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors sm:right-4",
                        done
                          ? "bg-emerald-50 text-emerald-600"
                          : "text-muted-foreground/70 group-hover:bg-muted group-hover:text-foreground group-focus-visible:bg-muted group-focus-visible:text-foreground",
                      )}
                    >
                      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </span>
                    <span aria-live="polite" className="sr-only">
                      {done ? `${row.label} copié` : ""}
                    </span>
                  </button>
                );
              })}
            </dl>
          )}
        </article>
      ))}
      {children}
    </section>
  );
}

/** Pièces du dossier, rangées par personne puis le bien et le bail : voir ou télécharger chacune. */
function PiecesCard({ view }: { view: NotaireDossierView }) {
  const { downloadFile, isFileDownloading } = useDownloadFile();
  return (
    <section
      aria-labelledby="pieces-title"
      className="overflow-hidden rounded-2xl border bg-background"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 id="pieces-title" className="text-[15px] font-semibold">
          Pièces{" "}
          <span className="font-normal text-muted-foreground">
            · {view.documentCount}
          </span>
        </h3>
        {view.documentCount > 0 && (
          <a
            href={`/api/notaire/dossiers/${view.assignmentId}/zip`}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-primary hover:bg-primary/5"
          >
            <Download className="size-3.5" />
            Zip
          </a>
        )}
      </div>
      {view.documents.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          Aucune pièce pour le moment
        </p>
      ) : (
        <div className="flex flex-col">
          {view.documents.map((group) => (
            <div key={group.key} className="border-b last:border-b-0">
              <p className="px-4 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {group.title}
              </p>
              <ul className="pb-2">
                {group.documents.map((doc) => (
                  <PieceRow
                    key={doc.id}
                    doc={doc}
                    downloading={isFileDownloading(doc.fileKey)}
                    onDownload={() => downloadFile(doc.fileKey, doc.zipName)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PieceRow({
  doc,
  downloading,
  onDownload,
}: {
  doc: DossierDocument;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <li className="flex items-center gap-1 px-2">
      <div className="min-w-0 flex-1">
        <DocumentViewer
          document={
            {
              id: doc.id,
              kind: doc.kindCode,
              fileKey: doc.fileKey,
              mimeType: doc.mimeType,
              label: doc.fileName,
            } as any
          }
          documentKindLabels={documentKindLabels}
        >
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/60"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">
                {doc.kind}
                {doc.who && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {doc.who}
                  </span>
                )}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {doc.fileName}
              </span>
            </span>
            <Eye
              className="size-4 shrink-0 text-muted-foreground"
              aria-label="Voir"
            />
          </button>
        </DocumentViewer>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        onClick={onDownload}
        disabled={downloading}
        aria-label={`Télécharger ${doc.kind}`}
      >
        {downloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
      </Button>
    </li>
  );
}
