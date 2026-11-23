"use client";

import {
  Armchair,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  GraduationCap,
  Home,
  Store,
  Warehouse,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Reveal, SectionLabel, SpotlightCard } from "./ui/lp-primitives";
import { useClientSession } from "./lp-user-menu";
import { cn } from "@/lib/utils";

/* Couleur du bail commercial : un violet voisin du bleu BailNotarie, pour le distinguer sans rompre la charte. */
export const COMMERCIAL_TONE = {
  text: "text-[#5b47e0]",
  soft: "bg-[#6d5cf5]/[0.08]",
  border: "border-[#6d5cf5]/20",
  gradient: "from-[#8a7bf8] to-[#5b47e0]",
};

/* ---------- A · Les deux pastilles du haut de page ---------- */

/* Côte à côte, même sur téléphone : les précisions n'apparaissent qu'à partir de md.
   Chaque pastille ouvre « Commencer » avec son type de bail ; déjà connecté, l'espace client. */
export function LpBailTypePills({ className }: { className?: string }) {
  const session = useClientSession();
  const connected = session.status === "client";
  const pill =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-white/80 py-1 pl-1 pr-3 text-[13px] font-medium text-slate-800 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3.5 sm:text-[13.5px]";
  return (
    <div className={cn("flex flex-nowrap items-center justify-center gap-2 sm:gap-2.5", className)}>
      <Link
        href={connected ? "/client" : "/commencer?bail=habitation"}
        className={cn(pill, "border-[#4373f5]/20 shadow-[0_8px_24px_-16px_rgba(30,58,138,0.55)] hover:border-[#4373f5]/40")}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#5b85f7] to-[#3563e9] text-white">
          <Home className="h-3.5 w-3.5" />
        </span>
        Bail d&apos;habitation
        <span className="hidden text-slate-400 md:inline">·</span>
        <span className="hidden text-slate-500 md:inline">vide ou meublé</span>
      </Link>
      <Link
        href={connected ? "/client" : "/commencer?bail=commercial"}
        className={cn(pill, "border-[#6d5cf5]/25 shadow-[0_8px_24px_-16px_rgba(91,71,224,0.6)] hover:border-[#6d5cf5]/45")}
      >
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-white", COMMERCIAL_TONE.gradient)}>
          <Store className="h-3.5 w-3.5" />
        </span>
        Bail commercial
        <span className="hidden text-slate-400 md:inline">·</span>
        <span className="hidden text-slate-500 md:inline">boutiques, bureaux, locaux</span>
        <span className="rounded-full bg-gradient-to-b from-[#8a7bf8] to-[#5b47e0] px-1.5 py-px text-[10.5px] font-semibold uppercase leading-4 tracking-wide text-white">
          New
        </span>
      </Link>
    </div>
  );
}

/* ---------- B · La bande qui défile ---------- */

const BAND = [
  { icon: Home, label: "Bail d'habitation", commercial: false },
  { icon: Armchair, label: "Location meublée", commercial: false },
  { icon: GraduationCap, label: "Bail étudiant", commercial: false },
  { icon: Store, label: "Bail commercial 3-6-9", commercial: true },
  { icon: Clock3, label: "Bail dérogatoire", commercial: true },
  { icon: BriefcaseBusiness, label: "Bureaux", commercial: true },
  { icon: Wrench, label: "Locaux d'activité", commercial: true },
  { icon: Warehouse, label: "Entrepôts", commercial: true },
];

export function LpBailMarquee() {
  const items = [...BAND, ...BAND];
  return (
    <section aria-label="Les baux que nous préparons" data-lp-chrome="#ffffff" className="relative overflow-hidden border-y border-slate-200/70 bg-white py-4">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
      <div className="flex w-max items-center gap-3 motion-reduce:animate-none" style={{ animation: "lp-marquee-x 38s linear infinite" }}>
        {items.map((item, index) => (
          <span
            key={`${item.label}-${index}`}
            aria-hidden={index >= BAND.length}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium",
              item.commercial ? "border-[#6d5cf5]/20 bg-[#6d5cf5]/[0.06] text-[#4a38c9]" : "border-[#4373f5]/15 bg-[#4373f5]/[0.05] text-[#2f55cf]",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------- C · Deux baux, un même parcours ---------- */

const FAMILIES = [
  {
    key: "habitation",
    icon: Home,
    title: "Bail d'habitation",
    kinds: "Bail nu · bail meublé 1 an · bail étudiant 9 mois",
    cta: "Commencer mon bail d'habitation",
    href: "/commencer?bail=habitation",
    price: "39,90 €",
    points: ["Plafond de loyer et zone tendue vérifiés", "Mobilier du meublé contrôlé", "Dépôt de garantie plafonné"],
    gradient: "from-[#5b85f7] to-[#3563e9]",
    ring: "hover:shadow-[0_24px_60px_-28px_rgba(30,58,138,0.45)]",
    check: "text-[#3563e9]",
    commercial: false,
  },
  {
    key: "commercial",
    icon: Store,
    title: "Bail commercial",
    kinds: "Bail 3-6-9 · bail dérogatoire jusqu'à 36 mois",
    cta: "Commencer mon bail commercial",
    href: "/commencer?bail=commercial",
    price: "59,90 €",
    points: ["Activité, destination et pas-de-porte", "Charges et travaux (loi Pinel)", "Garant, clauses et conjoint signataire"],
    gradient: COMMERCIAL_TONE.gradient,
    ring: "hover:shadow-[0_24px_60px_-28px_rgba(91,71,224,0.5)]",
    check: "text-[#5b47e0]",
    commercial: true,
  },
];

export function LpBailFamilies() {
  // Déjà connecté : les cartes mènent à l'espace client, comme les pastilles du haut (m24).
  const session = useClientSession();
  const connected = session.status === "client";
  return (
    <section id="baux" aria-labelledby="lp-baux-title" data-lp-chrome="#ffffff" className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel icon={Building2}>Nos baux</SectionLabel>
          <h2 id="lp-baux-title" className="lp-title lp-balance mt-6 text-4xl font-bold text-slate-900 sm:text-[3.25rem]">
            Habitation ou commercial, <span className="lp-gradient-text">un même parcours</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Le formulaire s&apos;adapte à votre bail : il ne pose que les questions utiles, vérifie les règles propres à chacun
            et transmet un dossier complet au notaire.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {FAMILIES.map((family, index) => (
            <Reveal key={family.key} delay={0.08 * index} className="h-full">
              <SpotlightCard
                className={cn(
                  "relative h-full rounded-3xl border bg-white p-6 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 sm:p-7",
                  family.commercial ? "border-[#6d5cf5]/25" : "border-slate-200",
                  family.ring,
                )}
              >
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_12px_28px_-14px_rgba(53,99,233,0.9)]", family.gradient)}>
                      <family.icon className="h-5 w-5" />
                    </span>
                    {family.commercial && (
                      <span className="rounded-full bg-[#6d5cf5]/10 px-2.5 py-1 text-[12px] font-semibold text-[#5b47e0]">Nouveau</span>
                    )}
                  </div>
                  <h3 className="mt-5 text-[22px] font-bold tracking-tight text-slate-900">{family.title}</h3>
                  <p className="mt-1 text-[14px] text-slate-500">{family.kinds}</p>
                  <ul className="mt-5 space-y-2.5">
                    {family.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-[14.5px] text-slate-700">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", family.check)} strokeWidth={2.5} />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 border-t border-slate-100 pt-5 sm:mt-auto">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[28px] font-bold tracking-tight text-slate-900">{family.price}</span>
                      <span className="text-[13px] text-slate-500">TTC, hors frais de notaire</span>
                    </div>
                    <a
                      href={connected ? "/client" : family.href}
                      className={cn(
                        "group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-center text-[15px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5",
                        family.commercial
                          ? "bg-gradient-to-b from-[#8a7bf8] to-[#5b47e0] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_30px_-12px_rgba(91,71,224,0.9)]"
                          : "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_30px_-12px_rgba(53,99,233,0.9)]",
                      )}
                    >
                      {family.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </div>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- D · Le choix du bail dans le tarif (fond sombre) ---------- */

export function LpFamilySwitch({ value, onChange }: { value: "HABITATION" | "COMMERCIAL"; onChange: (value: "HABITATION" | "COMMERCIAL") => void }) {
  return (
    <div role="radiogroup" aria-label="Type de bail" className="inline-grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-1">
      {(
        [
          { value: "HABITATION", label: "Habitation", icon: Home },
          { value: "COMMERCIAL", label: "Commercial", icon: Store },
        ] as const
      ).map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition-all",
              active
                ? option.value === "COMMERCIAL"
                  ? "bg-gradient-to-b from-[#8a7bf8] to-[#5b47e0] text-white shadow-[0_8px_20px_-10px_rgba(91,71,224,0.9)]"
                  : "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white shadow-[0_8px_20px_-10px_rgba(53,99,233,0.9)]"
                : "text-blue-100/70 hover:text-white",
            )}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
