"use client";

import * as React from "react";
import {
  Building2,
  Euro,
  FileText,
  Home,
  Monitor,
  Smartphone,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { DetailModel } from "@/components/client-v2/detail-model";
import { DetailVariant, VARIANTS, type VariantKey } from "@/components/client-v2/detail-variants";
import { PrimaryAction, QuietAction } from "@/components/client-v2/owner-ui";

/* Maquette de comparaison : quatre mises en page, deux sous-pages. */

const BIEN: DetailModel = {
  kind: "bien",
  eyebrow: "Le bien",
  title: "Maison Chartrons",
  subtitle: "14 rue des Chartrons, 33000 Bordeaux",
  status: { label: "Complété", tone: "emerald" },
  icon: Home,
  backHref: "#",
  trail: [{ label: "Mes dossiers", href: "#" }, { label: "Maison Chartrons" }],
  stats: [
    { label: "Surface", value: "82 m²" },
    { label: "Type", value: "Appartement" },
    { label: "Baux", value: "2" },
    { label: "Pièces", value: "4" },
  ],
  actions: (
    <PrimaryAction className="py-2.5">
      <FileText className="h-4 w-4" />
      Nouveau bail
    </PrimaryAction>
  ),
  sections: [
    {
      id: "infos",
      title: "Informations",
      icon: Building2,
      fields: [
        { label: "Adresse", value: "14 rue des Chartrons, 33000 Bordeaux", wide: true },
        { label: "Label", value: "Maison Chartrons" },
        { label: "Type de logement", value: "Appartement" },
        { label: "Surface", value: "82 m²" },
        { label: "Statut du bien", value: "Copropriété" },
        { label: "Créé le", value: "12/03/2025" },
        { label: "Modifié le", value: "02/09/2025" },
      ],
    },
    {
      id: "baux",
      title: "Baux · 2",
      icon: FileText,
      node: (
        <ul className="space-y-2">
          {[
            { t: "Signé", s: "À partir du 01/10/2025" },
            { t: "Locataire à ajouter", s: "Date de début à définir" },
          ].map((bail) => (
            <li key={bail.t}>
              <a
                href="#"
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition-colors hover:border-[#4373f5]/40"
              >
                <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#4373f5]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-slate-900">{bail.t}</span>
                  <span className="block text-[11.5px] text-slate-500">{bail.s}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ),
    },
  ],
};

const BAIL: DetailModel = {
  kind: "bail",
  eyebrow: "Le bail",
  title: "Maison Chartrons",
  subtitle: "Bail d'habitation · 14 rue des Chartrons, 33000 Bordeaux",
  status: {
    label: "Chez le notaire",
    tone: "violet",
    note: "Un notaire a pris votre dossier en charge. Il vous contacte bientôt.",
  },
  icon: FileText,
  backHref: "#",
  trail: [
    { label: "Mes dossiers", href: "#" },
    { label: "Maison Chartrons", href: "#" },
    { label: "Le bail" },
  ],
  stats: [
    { label: "Loyer", value: "1 150 €" },
    { label: "Charges", value: "90 €" },
    { label: "Dépôt", value: "1 150 €" },
    { label: "Total", value: "1 240 €" },
  ],
  actions: (
    <QuietAction className="py-2.5">
      <UserRound className="h-4 w-4" />
      Discuter avec le notaire
    </QuietAction>
  ),
  sections: [
    {
      id: "contrat",
      title: "Le contrat",
      icon: FileText,
      fields: [
        { label: "Catégorie", value: "Bail d'habitation" },
        { label: "Type de bail", value: "Bail nu 3 ans" },
        { label: "Date de début", value: "01/10/2025" },
        { label: "Date de fin", value: "01/10/2028" },
        { label: "Jour de paiement", value: "Le 5 de chaque mois" },
      ],
    },
    {
      id: "argent",
      title: "Loyer et charges",
      icon: Euro,
      fields: [
        { label: "Loyer mensuel", value: "1 150,00 €" },
        { label: "Charges mensuelles", value: "90,00 €" },
        { label: "Dépôt de garantie", value: "1 150,00 €" },
        { label: "Total mensuel", value: "1 240,00 €" },
      ],
    },
    {
      id: "locataire",
      title: "Le locataire",
      icon: UserRound,
      fields: [
        { label: "Nom", value: "Julie Bernard" },
        { label: "Email", value: "julie.bernard@example.com" },
      ],
    },
  ],
};

export default function TestFiches() {
  const [variant, setVariant] = React.useState<VariantKey>("bandeau");
  const [kind, setKind] = React.useState<"bien" | "bail">("bien");
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const model = kind === "bien" ? BIEN : BAIL;
  const current = VARIANTS.find((entry) => entry.key === variant)!;

  return (
    <div className="min-h-screen bg-[#eef1f8]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#3563e9]">
          Maquette
        </p>
        <h1 className="lp-title mt-2 text-[26px] font-bold tracking-tight text-slate-900">
          Quatre façons de dire « sous-page »
        </h1>

        <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-4">
          <div>
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Mise en page
            </p>
          <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200/80">
            {VARIANTS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setVariant(entry.key)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                  variant === entry.key
                    ? "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {entry.name}
              </button>
            ))}
          </div>
          </div>
          <div>
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Quelle page
            </p>
          <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200/80">
            {(["bien", "bail"] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setKind(entry)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-[12.5px] font-semibold capitalize transition-colors",
                  kind === entry ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {entry}
              </button>
            ))}
          </div>
          </div>
          <div>
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Écran
            </p>
          <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200/80">
            {([
              { id: "desktop" as const, label: "Bureau", icon: Monitor },
              { id: "mobile" as const, label: "Mobile", icon: Smartphone },
            ]).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setDevice(entry.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
                  device === entry.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <entry.icon className="h-3.5 w-3.5" />
                {entry.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        {/* Ce qu'on regarde, écrit noir sur blanc : sur une maquette à trois
            bascules, on ne devine pas l'état courant. */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200/80">
          <span className="text-[13.5px] font-bold tracking-tight text-slate-900">
            Option {current.name}
          </span>
          <span className="text-[13px] text-slate-400">·</span>
          <span className="text-[13.5px] font-semibold text-[#3563e9]">
            {kind === "bien" ? "Page du bien" : "Page du bail"}
          </span>
          <span className="text-[13px] text-slate-400">·</span>
          <span className="text-[12.5px] text-slate-500">{current.idea}</span>
        </div>

        <div className="mt-4">
          {device === "desktop" ? (
            <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_40px_80px_-40px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70">
              <div className="h-[760px] overflow-y-auto">
                <DetailVariant variant={variant} model={model} />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-[390px] max-w-full overflow-hidden rounded-[38px] bg-slate-900 p-2.5 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.5)]">
                <div className="h-[780px] overflow-y-auto rounded-[30px] bg-white">
                  <DetailVariant variant={variant} model={model} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
