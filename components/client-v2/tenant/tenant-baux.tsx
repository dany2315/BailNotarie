"use client";

import * as React from "react";
import { FileText, Search } from "lucide-react";

import { EmptyState, MicroLabel, OwnerCanvas, SectionHeading, Surface } from "../owner-ui";
import { TenantBailLine } from "./tenant-bail-line";
import { STEP_INDEX, TERMINAL_STATUSES, type TenantBail } from "./model";

/* =========================================================================
   « Mes baux » — la liste complète, côté locataire.

   Le locataire n'a pas de biens : ses baux sont les objets de premier rang.
   La page est donc une liste unique, dans la même écriture que « Mes
   dossiers » chez le propriétaire — un point d'état, une ligne, un dépli —
   séparée en deux temps : ce qui court, puis ce qui est clos.

   Aucune règle métier ici : la page reçoit les baux tels que la base les
   renvoie et se contente de les ranger.
   ========================================================================= */

export interface TenantBauxProps {
  baux: TenantBail[];
  /** Fourni par la maquette uniquement. */
  onOpenDetail?: (bailId: string) => void;
}

export function TenantBaux({ baux, onOpenDetail }: TenantBauxProps) {
  const [query, setQuery] = React.useState("");
  const showSearch = baux.length > 6;

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return baux;
    return baux.filter((bail) =>
      `${bail.property.label ?? ""} ${bail.property.fullAddress ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [baux, query]);

  /* Ordre d'affichage uniquement : ce qui court d'abord, le plus récent
     devant, et les baux clos rassemblés en fin de page. */
  const running = visible
    .filter((bail) => !TERMINAL_STATUSES.includes(bail.status))
    .sort((a, b) => (STEP_INDEX[a.status] ?? 0) - (STEP_INDEX[b.status] ?? 0));
  const closed = visible.filter((bail) => TERMINAL_STATUSES.includes(bail.status));

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:pb-14">
        <header className="mb-7">
          <MicroLabel>Espace locataire</MicroLabel>
          <h1 className="lp-title mt-1.5 text-[26px] font-bold text-slate-900 sm:text-[32px]">
            Mes baux
          </h1>
          <p className="mt-1 text-[13.5px] text-slate-500">
            {baux.length > 0
              ? `${baux.length} ${baux.length > 1 ? "baux associés" : "bail associé"}`
              : "Consultez vos baux et échangez avec votre notaire"}
          </p>
        </header>

        {showSearch && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un bien"
              className="w-full bg-transparent text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-[12px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Effacer
              </button>
            )}
          </div>
        )}

        {baux.length === 0 ? (
          <Surface tone="raised">
            <EmptyState
              icon={FileText}
              title="Aucun bail pour l'instant"
              description="Vous serez prévenu dès qu'un bail vous sera associé."
            />
          </Surface>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-slate-400">
            Aucun bail ne correspond à « {query} ».
          </p>
        ) : (
          <div className="space-y-8">
            {running.length > 0 && (
              <section className="space-y-3">
                <SectionHeading title="En cours" count={running.length} />
                <Surface tone="raised" className="divide-y divide-slate-200/60 overflow-hidden">
                  {running.map((bail) => (
                    <TenantBailLine key={bail.id} bail={bail} onOpenDetail={onOpenDetail} />
                  ))}
                </Surface>
              </section>
            )}

            {closed.length > 0 && (
              <section className="space-y-3">
                <SectionHeading title="Terminés" count={closed.length} />
                <Surface tone="raised" className="divide-y divide-slate-200/60 overflow-hidden">
                  {closed.map((bail) => (
                    <TenantBailLine key={bail.id} bail={bail} onOpenDetail={onOpenDetail} />
                  ))}
                </Surface>
              </section>
            )}
          </div>
        )}
      </div>
    </OwnerCanvas>
  );
}
