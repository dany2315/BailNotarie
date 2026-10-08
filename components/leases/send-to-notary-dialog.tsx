"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllNotaires } from "@/lib/actions/notaires";
import { validateAndSendToNotary } from "@/lib/actions/admin-bail";

interface SendToNotaryButtonProps {
  bailId: string;
  /** Notaire déjà assigné : on ne le redemande pas. */
  assignedNotaireName?: string | null;
  /** Raison pour laquelle l'envoi est impossible (manques, étape…). */
  disabledReason?: string | null;
  label?: string;
  /** La raison est déjà affichée ailleurs (colonne « Vérification ») : seulement au survol. */
  hideReason?: boolean;
}

export function SendToNotaryButton({
  bailId,
  assignedNotaireName,
  disabledReason,
  label = "Valider et envoyer au notaire",
  hideReason = false,
}: SendToNotaryButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notaires, setNotaires] = React.useState<Array<{ id: string; name: string | null; email: string; count: number }> | null>(null);
  const [notaireId, setNotaireId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open || notaires || assignedNotaireName) return;
    getAllNotaires()
      .then((list: any[]) =>
        setNotaires(
          list.map((n) => ({ id: n.id, name: n.name, email: n.email, count: n._count?.notaireAssignments ?? 0 })),
        ),
      )
      .catch(() => {
        toast.error("Impossible de charger la liste des notaires");
        setNotaires([]);
      });
  }, [open, notaires, assignedNotaireName]);

  const submit = async () => {
    if (!assignedNotaireName && !notaireId) {
      toast.error("Choisissez un notaire");
      return;
    }
    setSubmitting(true);
    const result = await validateAndSendToNotary({ bailId, notaireId: notaireId || null, notes: notes || null });
    setSubmitting(false);
    if (result.success) {
      toast.success("Dossier validé et envoyé au notaire");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <Button onClick={() => setOpen(true)} disabled={!!disabledReason} className="h-11 w-full gap-2 px-5 disabled:bg-slate-400 disabled:text-white disabled:opacity-100 sm:w-auto" title={disabledReason || undefined}>
        {label}
      </Button>
      {disabledReason && !hideReason && <span className="max-w-xs text-xs text-muted-foreground sm:text-right">{disabledReason}</span>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Valider et envoyer au notaire</DialogTitle>
            <DialogDescription>
              Le dossier passe « Prêt pour notaire ». Propriétaire, locataire et bien sont marqués vérifiés : les
              clients et le notaire reçoivent un e-mail.
            </DialogDescription>
          </DialogHeader>

          {assignedNotaireName ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              Notaire déjà assigné : <strong>{assignedNotaireName}</strong>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="send-notaire">Notaire</Label>
              {notaires === null ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Chargement des notaires…
                </span>
              ) : notaires.length === 0 ? (
                <span className="text-sm text-destructive">Aucun notaire enregistré.</span>
              ) : (
                <Select value={notaireId} onValueChange={setNotaireId}>
                  <SelectTrigger id="send-notaire" className="h-11">
                    <SelectValue placeholder="Choisir un notaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {notaires.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name || n.email} · {n.count} dossier{n.count > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Label htmlFor="send-notes" className="mt-2">
                Note pour le notaire (facultatif)
              </Label>
              <Textarea id="send-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={submitting || (!assignedNotaireName && !notaireId)}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Valider et envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
