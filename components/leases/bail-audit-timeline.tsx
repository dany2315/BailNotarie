import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBailAuditLogs } from "@/lib/actions/bail-audit-log";
import { getBailStatusLabel } from "@/lib/utils/bails-labels";
import { formatDateTime } from "@/lib/utils/formatters";
import { BailAuditEventType, type BailAuditLog } from "@prisma/client";
import { CheckCircle2, CircleDollarSign, FileCheck2, History, Landmark, UserPlus } from "lucide-react";

type BailAuditTimelineProps = {
  bailId: string;
};

function getEventSentence(log: BailAuditLog) {
  switch (log.eventType) {
    case BailAuditEventType.BAIL_CREATED:
      return `${log.actorName} a créé le bail`;
    case BailAuditEventType.PAYMENT_RECEIVED:
      return `${log.actorName} a effectué le paiement des frais de dossier`;
    case BailAuditEventType.TENANT_ADDED:
      return `${log.actorName} a ajouté le locataire${log.tenantName ? ` ${log.tenantName}` : ""}`;
    case BailAuditEventType.TENANT_FORM_SUBMITTED:
      return `${log.tenantName || log.actorName} a soumis son formulaire locataire`;
    case BailAuditEventType.STATUS_CHANGED:
      return `${log.actorName} a fait passer le bail de statut "${getBailStatusLabel(log.fromStatus || "")}" à "${getBailStatusLabel(log.toStatus || "")}"`;
    case BailAuditEventType.NOTAIRE_ASSIGNED:
      return `${log.actorName} a assigné le dossier au notaire ${log.notaireName || "sélectionné"}`;
    default:
      return `${log.actorName} a effectué une action sur le bail`;
  }
}

function getEventIcon(eventType: BailAuditEventType) {
  switch (eventType) {
    case BailAuditEventType.BAIL_CREATED:
      return CheckCircle2;
    case BailAuditEventType.PAYMENT_RECEIVED:
      return CircleDollarSign;
    case BailAuditEventType.TENANT_ADDED:
      return UserPlus;
    case BailAuditEventType.TENANT_FORM_SUBMITTED:
      return FileCheck2;
    case BailAuditEventType.NOTAIRE_ASSIGNED:
      return Landmark;
    default:
      return History;
  }
}

export async function BailAuditTimeline({ bailId }: BailAuditTimelineProps) {
  const logs = await getBailAuditLogs(bailId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Historique du bail</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement enregistré pour ce bail.</p>
        ) : (
          <ol className="space-y-3">
            {logs.map((log) => {
              const Icon = getEventIcon(log.eventType);

              return (
                <li
                  key={log.id}
                  className="grid grid-cols-[minmax(8.5rem,11rem)_1.75rem_1fr] items-center gap-3 text-sm"
                >
                  <time className="text-xs text-muted-foreground" dateTime={log.createdAt.toISOString()}>
                    {formatDateTime(log.createdAt)}
                  </time>
                  <div className="relative flex h-full min-h-10 items-center justify-center">
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
                    <span className="relative z-10 flex size-7 items-center justify-center rounded-full border bg-background text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 font-medium leading-5">
                    {getEventSentence(log)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
