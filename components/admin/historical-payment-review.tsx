"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { confirmHistoricalPayment, rejectHistoricalPayment } from "@/lib/actions/historical-payments";

/**
 * Ancien dossier sans paiement enregistré : l'administrateur indique ce qu'il a vérifié.
 * Confirmer demande la preuve du rapprochement ; la date du paiement est facultative et reste vide si
 * elle n'est pas connue.
 */
export function HistoricalPaymentReview({ bailId }: { bailId: string }) {
  const [proof, setProof] = React.useState("");
  const [date, setDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const run = (action: () => Promise<{ success: true } | { success: false; error: string }>, done: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(done);
        // Décision prise une seule fois : la fiche est rechargée pour afficher le nouvel état du paiement.
        router.refresh();
      } else toast.error(result.error);
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5">
      <div>
        <p className="text-sm font-semibold text-amber-900">Ancien dossier : paiement à vérifier</p>
        <p className="mt-0.5 text-[13px] text-amber-800">
          Aucun paiement n&apos;est enregistré pour ce dossier créé avant le suivi actuel. Vérifiez dans Stripe ou en
          comptabilité, puis indiquez le résultat. Sans preuve, le dossier reste non payé.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="hp-proof">Preuve du paiement</Label>
          <Input
            id="hp-proof"
            value={proof}
            onChange={(event) => setProof(event.target.value)}
            placeholder="Référence Stripe, virement, facture…"
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hp-date">Date du paiement (si connue)</Label>
          <Input id="hp-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="hp-note">Note</Label>
          <Textarea id="hp-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} disabled={pending} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || proof.trim().length < 3}
          onClick={() =>
            run(() => confirmHistoricalPayment({ bailId, proofReference: proof, paymentDate: date, note }), "Paiement historique confirmé")
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Confirmer le paiement
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || note.trim().length < 3}
          title="Indiquez dans la note ce qui a été vérifié"
          onClick={() => run(() => rejectHistoricalPayment({ bailId, note }), "Vérification enregistrée : aucun paiement retrouvé")}
        >
          Aucun paiement retrouvé
        </Button>
      </div>
    </div>
  );
}
