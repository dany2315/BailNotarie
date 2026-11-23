"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompletionChip } from "@/components/shared/completion-chip";
import { changeBailTenantAdmin, searchTenantsAdmin, type TenantOption } from "@/lib/actions/admin-bail-edit";
import { cn } from "@/lib/utils";

type Mode = "existing" | "email";

/**
 * Remplace le locataire du dossier : un locataire déjà connu, ou un nouveau à
 * partir de son e-mail (il reçoit alors le formulaire locataire).
 */
export function ChangeTenantDialog({
  open,
  onOpenChange,
  bailId,
  currentTenant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bailId: string;
  currentTenant: { id: string; name: string } | null;
}) {
  const pathname = usePathname();
  const [mode, setMode] = React.useState<Mode>("existing");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<TenantOption[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<TenantOption | null>(null);
  const [email, setEmail] = React.useState("");
  const [sendForm, setSendForm] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setMode("existing");
    setQuery("");
    setResults([]);
    setSelected(null);
    setEmail("");
    setSendForm(true);
  }, [open]);

  // Recherche avec un court délai, la dernière frappe l'emporte.
  React.useEffect(() => {
    if (mode !== "existing") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const result = await searchTenantsAdmin({ query: q, excludeId: currentTenant?.id });
      if (cancelled) return;
      setSearching(false);
      if (result.success) setResults(result.data);
      else toast.error(result.error);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, mode, currentTenant?.id]);

  const canSubmit = mode === "existing" ? !!selected : /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const result = await changeBailTenantAdmin({
      bailId,
      ...(mode === "existing" ? { tenantId: selected!.id } : { email: email.trim() }),
      sendForm,
      revalidate: pathname,
    });
    setSaving(false);
    if (result.success) {
      toast.success(
        `Locataire remplacé par ${result.data.tenantName}${result.data.formSent ? " · formulaire envoyé" : ""}`,
      );
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Changer de locataire</DialogTitle>
          <DialogDescription>
            {currentTenant ? `${currentTenant.name} sera retiré du dossier` : "L'ancien locataire sera retiré du dossier"} : sa fiche
            client est conservée, son formulaire en attente pour ce dossier est désactivé.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Nouveau locataire">
          {(
            [
              ["existing", "Locataire déjà connu"],
              ["email", "Nouveau, par e-mail"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
              className={cn(
                "min-h-10 flex-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors",
                mode === key && "bg-background text-foreground shadow-sm",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          <div className="flex flex-col gap-3">
            <Label htmlFor="tenant-search" className="sr-only">
              Rechercher un locataire
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tenant-search"
                autoFocus
                autoComplete="off"
                placeholder="Nom, prénom ou e-mail"
                className="h-11 pl-9"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(null);
                }}
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" role="listbox" aria-label="Locataires trouvés">
              {results.map((tenant) => {
                const active = selected?.id === tenant.id;
                return (
                  <li key={tenant.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelected(tenant)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60",
                        active && "border-primary bg-primary/5 hover:bg-primary/5",
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">{tenant.name}</span>
                        {tenant.email && <span className="truncate text-[13px] text-muted-foreground">{tenant.email}</span>}
                      </span>
                      <CompletionChip status={tenant.completionStatus} />
                      {active && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun locataire trouvé.{" "}
                <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setMode("email")}>
                  Ajouter un nouveau locataire par e-mail
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-email">E-mail du nouveau locataire</Label>
            <Input
              id="tenant-email"
              type="email"
              autoFocus
              autoComplete="off"
              className="h-11"
              placeholder="prenom.nom@exemple.fr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <span className="text-xs text-muted-foreground">Si cet e-mail correspond déjà à un locataire, sa fiche est reprise.</span>
          </div>
        )}

        <label className="flex min-h-10 items-start gap-3 text-sm">
          <Checkbox checked={sendForm} onCheckedChange={(checked) => setSendForm(checked === true)} className="mt-0.5" />
          <span>
            Envoyer le formulaire locataire par e-mail
            <span className="block text-xs text-muted-foreground">Seulement s'il ne l'a pas déjà rempli pour ce dossier.</span>
          </span>
        </label>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Changer de locataire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
