"use client";

import * as React from "react";
import { LpNav } from "@/components/lp/lp-nav";
import { OwnerRuntime } from "@/components/client-v2/owner-runtime";
import {
  OwnerTabsBar,
  OwnerTabsDock,
  OwnerTabKey,
  OWNER_TABS,
  TENANT_TABS,
} from "@/components/client-v2/owner-tabs";
import { OwnerDashboard } from "@/components/client-v2/owner-dashboard";
import { OwnerDossiers, VARIANTS, type DossiersVariant } from "@/components/client-v2/owner-dossiers";
import { OwnerInformations } from "@/components/client-v2/owner-informations";
import { TenantBailDetail, TenantBaux, TenantDashboard } from "@/components/client-v2/tenant";
import { cn } from "@/lib/utils";
import {
  DEMO_ACTIVE_INTAKES,
  DEMO_BAIL_DRAFTS,
  DEMO_BAUX,
  DEMO_BIENS,
  DEMO_CLIENT_DOCUMENTS,
  DEMO_LOCATAIRES,
  DEMO_OWNER_ID,
  DEMO_PENDING_REQUESTS,
  DEMO_PERSONS,
  DEMO_TENANT_BAUX,
  DEMO_TENANT_DETAIL,
  DEMO_TENANT_INTAKE,
  DEMO_TENANT_NAME,
  DEMO_TENANT_PERSONS,
  DEMO_TENANT_REQUESTS,
  DEMO_USER_NAME,
} from "./demo-data";

/* =========================================================================
   Maquette de l'espace client propriétaire.

   Les trois pages sont les composants réels (`components/client-v2/*`), avec
   leurs états, leurs dialogues et leurs règles métier. Seules deux choses
   diffèrent d'une vraie session : les données viennent de `demo-data.ts`, et
   `OwnerRuntime demo` empêche les écritures en base et remplace les tiroirs
   qui chargent un dossier réel par un aperçu.

   La navigation se fait ici par état plutôt que par URL, pour pouvoir passer
   d'une page à l'autre sans session ouverte.
   ========================================================================= */

const ENTREPRISE = {
  id: "entreprise-demo",
  legalName: "SCI Les Lilas",
  name: "Les Lilas",
  registration: "912 457 883 00018",
  email: "gestion@scileslilas.fr",
  phone: "02 40 11 22 33",
  fullAddress: "9 rue des Lilas, 44000 Nantes",
  documents: [
    {
      id: "doc-kbis",
      kind: "KBIS",
      fileKey: "demo/kbis.pdf",
      mimeType: "application/pdf",
      label: "Extrait Kbis",
      createdAt: new Date().toISOString(),
    },
  ],
} as any;

export function TestEspaceClient() {
  const [space, setSpace] = React.useState<"proprietaire" | "locataire">("proprietaire");
  const [tab, setTab] = React.useState<OwnerTabKey>("dashboard");
  const [asEntreprise, setAsEntreprise] = React.useState(false);
  const [dossiersVariant, setDossiersVariant] = React.useState<DossiersVariant>("fiches");
  const [tenantDetail, setTenantDetail] = React.useState<string | null>(null);

  return (
    <OwnerRuntime demo>
      <div className="min-h-svh bg-background pb-[76px] sm:pb-0">
        <LpNav overlay />

        {/* Sélecteur réservé à la maquette : les deux côtés du bail. */}
        <div className="mx-auto flex w-full max-w-3xl justify-center px-4 pt-[calc(var(--lp-nav-h,76px)+0.5rem)] sm:px-6">
          <div className="inline-flex gap-1 rounded-full border border-slate-200/80 bg-white/80 p-1 backdrop-blur">
            {[
              { key: "proprietaire" as const, label: "Propriétaire" },
              { key: "locataire" as const, label: "Locataire" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setSpace(option.key);
                  setTab("dashboard");
                  setTenantDetail(null);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors",
                  space === option.key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <OwnerTabsBar
          tabs={space === "locataire" ? TENANT_TABS : OWNER_TABS}
          active={tab}
          onSelect={(key) => {
            setTab(key);
            setTenantDetail(null);
          }}
          className="!pt-3"
        />

        {/* Bascule de données réservée à la maquette : la même page vue par un
            particulier et par une société. */}
        {space === "proprietaire" && tab === "informations" && (
          <div className="mx-auto flex max-w-3xl justify-center px-4 pt-4 sm:justify-end sm:px-6">
            <div className="inline-flex gap-1 rounded-full border border-slate-200/80 bg-white/80 p-1 backdrop-blur">
              {[
                { key: false, label: "Particulier" },
                { key: true, label: "Société" },
              ].map((option) => (
                <button
                  key={String(option.key)}
                  type="button"
                  onClick={() => setAsEntreprise(option.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
                    asEntreprise === option.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {space === "locataire" && tab === "dashboard" && (
          <TenantDashboard
            baux={DEMO_TENANT_BAUX}
            pendingRequests={DEMO_TENANT_REQUESTS}
            activeIntake={DEMO_TENANT_INTAKE}
            userName={DEMO_TENANT_NAME}
          />
        )}

        {space === "locataire" && tab === "dossiers" && (
          tenantDetail ? (
            <TenantBailDetail
              bail={DEMO_TENANT_DETAIL}
              bailId={DEMO_TENANT_DETAIL.id}
              proprietaireName="Camille Fabre"
              hasProprietaire
              notaire={{ name: "Me Laurent", email: "me.laurent@example.fr" }}
              openChat={false}
              demoChat
            />
          ) : (
            <TenantBaux baux={DEMO_TENANT_BAUX} onOpenDetail={setTenantDetail} />
          )
        )}

        {space === "locataire" && tab === "informations" && (
          <OwnerInformations
            profil="locataire"
            clientType="PERSONNE_PHYSIQUE"
            persons={DEMO_TENANT_PERSONS}
            clientDocuments={DEMO_CLIENT_DOCUMENTS}
          />
        )}

        {space === "proprietaire" && tab === "dashboard" && (
          <OwnerDashboard
            baux={DEMO_BAUX}
            pendingRequests={DEMO_PENDING_REQUESTS}
            activeIntakes={DEMO_ACTIVE_INTAKES}
            bailDrafts={DEMO_BAIL_DRAFTS}
            userName={DEMO_USER_NAME}
          />
        )}

        {space === "proprietaire" && tab === "dossiers" && (
          <>
            {/* Sélecteur réservé à la maquette : quatre compositions de la
                même page, avec les mêmes données et la même logique. */}
            <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6">
              <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {VARIANTS.map((option) => {
                  const isActive = option.key === dossiersVariant;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setDossiersVariant(option.key)}
                      title={option.hint}
                      className={cn(
                        "shrink-0 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-[11.5px] text-slate-400">
                Option {VARIANTS.findIndex((option) => option.key === dossiersVariant) + 1} sur{" "}
                {VARIANTS.length} — {VARIANTS.find((option) => option.key === dossiersVariant)?.hint}
              </p>
            </div>
            <OwnerDossiers
              biens={DEMO_BIENS}
              locataires={DEMO_LOCATAIRES}
              ownerId={DEMO_OWNER_ID}
              variant={dossiersVariant}
            />
          </>
        )}

        {space === "proprietaire" && tab === "informations" &&
          (asEntreprise ? (
            <OwnerInformations
              clientType="PERSONNE_MORALE"
              entreprise={ENTREPRISE}
              clientDocuments={DEMO_CLIENT_DOCUMENTS}
            />
          ) : (
            <OwnerInformations
              clientType="PERSONNE_PHYSIQUE"
              persons={DEMO_PERSONS}
              clientDocuments={DEMO_CLIENT_DOCUMENTS}
            />
          ))}

        <OwnerTabsDock
          tabs={space === "locataire" ? TENANT_TABS : OWNER_TABS}
          active={tab}
          onSelect={setTab}
        />

        <span className="pointer-events-none fixed bottom-4 left-4 z-30 hidden rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-400 backdrop-blur sm:block">
          Maquette · /testEspaceclient
        </span>
      </div>
    </OwnerRuntime>
  );
}
