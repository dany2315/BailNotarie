"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Send, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RelanceEmailPreview } from "@/components/emails/relance-email-preview";
import { notifyOwnerTenantRemovedAdmin, removeBailTenantAdmin, type RemovedTenantInfo } from "@/lib/actions/admin-bail-edit";
import { relanceEmailContent } from "@/lib/utils/relance-content";

/**
 * Le locataire s'est désisté : on le retire du dossier sans le remplacer. Deux temps : la
 * confirmation (ce qui sera retiré), puis, une fois le retrait fait, l'aperçu de l'e-mail au
 * propriétaire, envoyé seulement si l'équipe le décide.
 */
export function RemoveTenantDialog({
  open,
  onOpenChange,
  bailId,
  currentTenant,
  notaireName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bailId: string;
  currentTenant: { id: string; name: string } | null;
  /** Notaire assigné : il le reste, le dossier lui sera renvoyé avec le nouveau locataire. */
  notaireName?: string | null;
}) {
  const pathname = usePathname();
  const [busy, setBusy] = React.useState(false);
  const [removed, setRemoved] = React.useState<RemovedTenantInfo | null>(null);
  const [body, setBody] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setRemoved(null);
    setBody(null);
    setNote("");
  }, [open]);

  const remove = async () => {
    setBusy(true);
    const result = await removeBailTenantAdmin({ bailId, revalidate: pathname });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data.tenantDeleted
        ? `${result.data.tenantName} a été retiré du dossier et sa fiche supprimée`
        : `${result.data.tenantName} a été retiré du dossier · fiche gardée : ${result.data.keptReason}`,
    );
    setRemoved(result.data);
  };

  const notify = async () => {
    if (!removed) return;
    setBusy(true);
    const result = await notifyOwnerTenantRemovedAdmin({
      bailId,
      tenantName: removed.tenantName,
      body: body?.trim() || undefined,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Propriétaire prévenu (${result.data.email})`);
    onOpenChange(false);
  };

  const tenantLabel = currentTenant?.name || "Le locataire";

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      {!removed ? (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Retirer le locataire</DialogTitle>
            <DialogDescription>
              {tenantLabel} n&apos;est plus rattaché à ce dossier, par exemple après un désistement. Le propriétaire pourra indiquer son
              nouveau locataire depuis son espace client.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <span className="font-medium">Supprimé :</span> {tenantLabel}, avec sa fiche client, ses pièces, son accès à
              l&apos;espace client, ses demandes de pièces et ses messages dans la discussion. C&apos;est définitif. Seule exception :
              s&apos;il est aussi locataire d&apos;un autre dossier, il est seulement retiré de ce dossier et sa fiche est gardée.
            </li>
            <li>
              <span className="font-medium">Effacés :</span> la date de prise d&apos;effet, le jour de paiement et la date de fin. Ils
              seront redemandés avec le nouveau locataire.
            </li>
            <li>
              <span className="font-medium">Statut :</span> le dossier repasse « En attente du locataire ».
            </li>
            {notaireName && (
              <li>
                <span className="font-medium">Notaire :</span> {notaireName} reste assigné. Une fois le nouveau locataire vérifié, renvoyez-lui
                le dossier avec « Envoyer au notaire ».
              </li>
            )}
            <li className="text-muted-foreground">Le paiement des frais de dossier, le bien et le loyer ne changent pas.</li>
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={remove} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
              Retirer le locataire
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent className="flex max-h-[min(92dvh,860px)] flex-col gap-4 overflow-hidden sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Prévenir le propriétaire ?</DialogTitle>
            <DialogDescription>
              {removed.tenantDeleted
                ? `${removed.tenantName} est retiré du dossier et sa fiche est supprimée.`
                : `${removed.tenantName} est retiré du dossier ; sa fiche est gardée, car ${removed.keptReason}.`}{" "}
              Vous pouvez relire et modifier l&apos;e-mail avant de l&apos;envoyer, ou ne pas
              prévenir le propriétaire.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
            <RelanceEmailPreview
              content={relanceEmailContent({
                reason: "TENANT_REMOVED",
                name: removed.owner.greetingName || "",
                address: removed.address,
                actionUrl: "",
                tenantName: removed.tenantName,
              })}
              reason="TENANT_REMOVED"
              address={removed.address}
              to={removed.owner.email}
              toName={removed.owner.name}
              toRole="Propriétaire"
              body={body}
              onBodyChange={setBody}
              note={note}
              onNoteChange={setNote}
              noteLabel="Votre mot au propriétaire"
              notePlaceholder="Un mot pour le propriétaire (facultatif)"
              noteMax={1000}
            />
          </div>
          {!removed.owner.email && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              Pas d&apos;adresse e-mail pour le propriétaire : l&apos;envoi est impossible.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Ne pas prévenir
            </Button>
            <Button type="button" onClick={notify} disabled={busy || !removed.owner.email} className="gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Prévenir le propriétaire
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
