"use client";

import { AlertTriangle, Check, Minus, Paperclip, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { cn } from "@/lib/utils";

type Status = "replace" | "missing" | "check" | "valid" | "na";

export interface NotaireDiagnostics {
  readAt: string | null;
  counts: { toFix: number; toCheck: number; valid: number };
  documents: Record<string, { id: string; kind: string; fileKey: string; mimeType: string | null; label: string | null }>;
  items: Array<{
    id: string;
    label: string;
    status: Status;
    text: string;
    finding: string | null;
    origin: string | null;
    decision: { kind: "CONFORME" | "NON_CONCERNE" | "DATE"; note: string | null; byName: string | null; at: string; documentId: string | null } | null;
  }>;
}

const STATUS: Record<Status, { label: string; chip: string; icon: React.ReactNode }> = {
  replace: { label: "À remplacer", chip: "bg-red-100 text-red-800", icon: <X className="size-3.5 text-red-700" strokeWidth={3} aria-hidden /> },
  missing: { label: "Manquant", chip: "bg-red-100 text-red-800", icon: <X className="size-3.5 text-red-700" strokeWidth={3} aria-hidden /> },
  check: { label: "À vérifier", chip: "bg-amber-100 text-amber-900", icon: <AlertTriangle className="size-3.5 text-amber-700" aria-hidden /> },
  valid: { label: "Valide", chip: "bg-green-100 text-green-800", icon: <Check className="size-3.5 text-green-700" strokeWidth={3} aria-hidden /> },
  na: { label: "Non concerné", chip: "bg-muted text-muted-foreground", icon: <Minus className="size-3.5 text-muted-foreground" strokeWidth={3} aria-hidden /> },
};

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

/** Diagnostics du bien, en lecture seule : statut, constat, origine de l'information et décisions de l'équipe. */
export function NotaireDiagnosticsCard({ diagnostics }: { diagnostics: NotaireDiagnostics }) {
  const { toFix, toCheck } = diagnostics.counts;
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Diagnostics</CardTitle>
        <CardDescription>
          {toFix + toCheck === 0
            ? "Tous les diagnostics exigés pour la location sont en ordre."
            : [toFix ? `${toFix} à remplacer` : null, toCheck ? `${toCheck} à vérifier` : null].filter(Boolean).join(" · ") +
              " : l'équipe BailNotarie s'en occupe."}
          {diagnostics.readAt ? ` Fichiers lus le ${day(diagnostics.readAt)}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y rounded-lg border px-3">
          {diagnostics.items.map((item) => {
            const status = STATUS[item.status];
            const proof = item.decision?.documentId ? diagnostics.documents[item.decision.documentId] : null;
            return (
              <li key={item.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-2 py-2.5">
                <span className="mt-[3px] flex size-[18px] items-center justify-center">{status.icon}</span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold">{item.label}</span>
                    {item.status !== "valid" && (
                      <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11.5px] font-semibold", status.chip)}>{status.label}</span>
                    )}
                  </div>
                  <span className={cn("text-sm", item.status === "na" && "text-muted-foreground")}>{item.text}</span>
                  {item.decision && (
                    <span className="text-[13px] text-muted-foreground">
                      {item.decision.kind === "CONFORME" ? "Déclaré conforme" : "Déclaré non concerné"} par {item.decision.byName || "l'équipe"} le{" "}
                      {day(item.decision.at)}
                      {item.decision.note ? ` : « ${item.decision.note} »` : ""}
                      {item.finding ? ` · constat initial : ${item.finding}` : ""}
                    </span>
                  )}
                  {proof && (
                    <DocumentViewer document={proof} documentKindLabels={documentKindLabels}>
                      <button type="button" className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-primary hover:underline">
                        <Paperclip className="size-3" />
                        Voir le justificatif
                      </button>
                    </DocumentViewer>
                  )}
                  {item.origin?.split("\n").map((line) => (
                    <span key={line} className="truncate text-xs text-muted-foreground" title={line}>
                      {line}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
