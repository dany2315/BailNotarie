"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getComplementReminderPreview, remindComplementRequest, type ComplementReminderPreviewData } from "@/lib/actions/complement-requests";
import { complementEmailContent, type ComplementEmailItem } from "@/lib/utils/complement";
import { ComplementEmailPreview } from "@/components/complements/complement-email-preview";

/**
 * Aperçu de l'e-mail de rappel d'une demande de pièces, fidèle à l'envoi : seulement ce qui est encore attendu,
 * message modifiable (sinon le texte de rappel prévu).
 */
export function ComplementReminderPreview({
  greetingName,
  recipientName,
  email,
  role,
  address,
  items,
  message,
  onMessageChange,
}: {
  greetingName: string;
  recipientName?: string;
  email: string | null;
  role?: string;
  address: string;
  items: ComplementEmailItem[];
  /** null : texte de rappel prévu. */
  message: string | null;
  onMessageChange: (value: string) => void;
}) {
  // Sans message modifié : le texte de rappel prévu.
  const planned = complementEmailContent({ name: greetingName, address, message: null, reminder: true, items }).message;
  return (
    <ComplementEmailPreview
      reminder
      name={greetingName}
      recipientName={recipientName}
      email={email}
      role={role}
      address={address}
      items={items}
      message={message ?? planned}
      onMessageChange={onMessageChange}
    />
  );
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

/** Relance d'une demande de pièces : l'aperçu de l'e-mail, modifiable, avant l'envoi. */
export function ComplementRemindDialog({ requestId, open, onOpenChange }: { requestId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [data, setData] = React.useState<ComplementReminderPreviewData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setMessage(null);
    getComplementReminderPreview(requestId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setData(result.data);
        else setError(result.error);
      })
      .catch(() => !cancelled && setError("L'aperçu n'a pas pu être chargé"));
    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  const send = async () => {
    setBusy(true);
    try {
      const result = await remindComplementRequest({ requestId, message: message?.trim() || undefined });
      if (!result.success) {
        toast.error("Le rappel n'a pas pu être envoyé", { description: result.error });
        return;
      }
      toast.success(`Rappel envoyé à ${data?.recipientEmail ?? "la personne"}`);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Le rappel n'a pas pu être envoyé");
    } finally {
      setBusy(false);
    }
  };

  const who = data?.target === "OWNER" ? "le propriétaire" : "le locataire";
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[min(92dvh,860px)] flex-col gap-4 overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{data ? `Relancer ${who}` : "Relancer"}</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.recipientName || "La personne"} reçoit à nouveau la demande par e-mail, avec seulement ce qu'il n'a pas encore envoyé. Voici l'e-mail tel qu'il partira.`
              : "Chargement de l'aperçu…"}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
          {error ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{error}</p>
          ) : !data ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-[13px] text-muted-foreground">
                Demandé le {fmtDay(data.createdAt)}
                {data.sentCount > 1 ? `, déjà relancé ${data.sentCount - 1} fois (dernière le ${fmtDay(data.lastSentAt)})` : ", jamais relancé"}.
              </p>
              <ComplementReminderPreview
                greetingName={data.greetingName}
                recipientName={data.recipientName}
                email={data.recipientEmail}
                role={data.target === "OWNER" ? "Propriétaire" : "Locataire"}
                address={data.address}
                items={data.items}
                message={message}
                onMessageChange={setMessage}
              />
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button type="button" onClick={send} disabled={busy || !data} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Envoyer le rappel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
