import Link from "next/link";
import { Search } from "lucide-react";
import { adminSearch } from "@/lib/actions/admin-search";
import { STATUS_LABELS, getStage, type BailStatusValue } from "@/lib/utils/bail-stage";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PROFIL_LABELS: Record<string, string> = {
  PROPRIETAIRE: "Propriétaire",
  LOCATAIRE: "Locataire",
  LEAD: "Prospect",
};

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await adminSearch(q);
  const total = results.dossiers.length + results.clients.length + results.biens.length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Recherche</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dossiers, clients et biens.</p>
      </div>

      <form action="/interface/recherche" method="get" role="search">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            name="q"
            defaultValue={results.query}
            autoFocus
            placeholder="Adresse, nom, raison sociale, e-mail, téléphone…"
            className="min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>
      </form>

      {results.query.length < 2 ? (
        <p className="text-sm text-muted-foreground">Saisissez au moins deux caractères.</p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun résultat pour « {results.query} ».</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Dossiers ({results.dossiers.length})</h2>
            {results.dossiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dossier.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {results.dossiers.map((d) => {
                  const stage = getStage(d.status);
                  return (
                    <li key={d.id} className="flex flex-col gap-1 py-2.5">
                      <Link href={`/interface/baux/${d.id}`} className="font-semibold hover:underline">
                        {d.address}
                      </Link>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn("rounded-md px-1.5 py-0.5 font-semibold", stage.className)}>{stage.label}</span>
                        {STATUS_LABELS[d.status as BailStatusValue] || d.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{d.parties.join(" · ")}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Clients ({results.clients.length})</h2>
            {results.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun client.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {results.clients.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1 py-2.5">
                    <Link href={`/interface/clients/${c.id}`} className="font-semibold hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {PROFIL_LABELS[c.profilType] || c.profilType}
                      {c.email ? ` · ${c.email}` : ""}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Biens ({results.biens.length})</h2>
            {results.biens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun bien.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {results.biens.map((b) => (
                  <li key={b.id} className="flex flex-col gap-1 py-2.5">
                    <Link href={`/interface/properties/${b.id}`} className="font-semibold hover:underline">
                      {b.label || b.address}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {b.label ? `${b.address} · ` : ""}
                      {b.ownerName || "Propriétaire inconnu"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
