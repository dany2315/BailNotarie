"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeEuro,
  Calculator,
  Check,
  Info,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Reveal, SectionLabel, Tilt3D } from "./ui/lp-primitives";

/* =========================================================================
   Tarif.

   Le coût d'un bail notarié se compose toujours de deux lignes : nos frais de
   dossier et ceux de l'étude notariale. Les présenter côte à côte, en deux
   cartes, laissait croire à deux offres au choix — alors que le client règle
   les deux. Elles sont donc réunies en une seule addition, avec un curseur de
   loyer pour rendre le total concret. Le cadrage reste juste sans être
   anxiogène : les frais notariés sont réglementés et dus quel que soit le
   chemin emprunté ; BailNotarie n'ajoute que 39,90 €.
   ========================================================================= */

const DOSSIER_FEE = 39.9;

const INCLUDED = [
  "Constitution du dossier 100% en ligne",
  "Vérification des pièces justificatives",
  "Transmission à l'étude notariale partenaire",
  "Suivi du dossier en temps réel",
  "Coordination jusqu'à la signature",
  "Support téléphonique dédié",
];

const REASSURANCE = [
  {
    icon: Landmark,
    title: "Les frais notariés sont réglementés",
    text: "Fixés par décret, identiques partout en France. Ils sont dus dès qu'un bail est authentifié, que vous passiez par nous ou non.",
  },
  {
    icon: Users,
    title: "Partageables avec le locataire",
    text: "Le partage des frais notariés entre bailleur et locataire est possible ; il se convient au moment de la signature.",
  },
  {
    icon: RefreshCw,
    title: "Une seule fois, pas un abonnement",
    text: "Vous payez à la constitution du bail. L'acte vous protège ensuite pendant toute la durée de la location.",
  },
];

const euro = (value: number, decimals = 0) =>
  value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export function LpPricing() {
  const [rent, setRent] = React.useState(900);

  // Règle annoncée par les études : environ la moitié d'un loyer mensuel hors
  // charges. Arrondi à la dizaine pour ne pas donner un faux air de devis.
  const notaryFee = Math.round(rent / 2 / 10) * 10;
  const total = notaryFee + DOSSIER_FEE;
  const fill = ((rent - 400) / (2500 - 400)) * 100;

  return (
    <section
      id="tarif"
      aria-labelledby="lp-pricing-title"
      data-lp-chrome="#070c1a"
      className="lp-scene relative scroll-mt-24 overflow-hidden bg-[#070c1a] py-24 text-white sm:py-32"
    >
      <div aria-hidden className="lp-mesh-dark absolute inset-0" />
      <div aria-hidden className="lp-grid-dark absolute inset-0" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel tone="dark" icon={BadgeEuro}>
            Tarif
          </SectionLabel>
          <h2 id="lp-pricing-title" className="lp-title lp-balance mt-6 text-4xl font-bold sm:text-[3.25rem]">
            Combien coûte <span className="lp-gradient-text-light">votre bail notarié</span> ?
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-100/70">
            Deux lignes, et rien d&apos;autre : nos frais de dossier, et les frais de l&apos;étude notariale fixés par
            l&apos;État. Voici ce que cela représente pour votre bien.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-stretch">
          {/* ---------- L'addition ---------- */}
          <Reveal className="h-full">
            <Tilt3D intensity={4} lift={14} className="h-full">
              <div className="lp-ring-gradient relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#132043] via-[#101a36] to-[#0b1228] p-6 sm:p-8">
                <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#4373f5]/30 blur-3xl" />

                <div className="relative">
                  {/* Curseur de loyer */}
                  <label htmlFor="lp-rent" className="block text-[13px] font-medium text-blue-100/70">
                    Loyer mensuel hors charges de votre bien
                  </label>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight sm:text-4xl">{euro(rent)} €</span>
                    <span className="text-[13px] text-blue-100/60">/ mois</span>
                  </div>
                  <input
                    id="lp-rent"
                    type="range"
                    min={400}
                    max={2500}
                    step={50}
                    value={rent}
                    onChange={(event) => setRent(Number(event.target.value))}
                    aria-label="Loyer mensuel hors charges"
                    aria-valuetext={`${euro(rent)} euros par mois`}
                    className="lp-range mt-1"
                    style={{ ["--lp-range-fill" as string]: `${fill}%` }}
                  />
                  <div className="-mt-1 flex justify-between text-[11.5px] text-blue-100/40">
                    <span>400 €</span>
                    <span>2 500 €</span>
                  </div>

                  {/* Les deux lignes, additionnées */}
                  <div className="mt-7 space-y-px overflow-hidden rounded-2xl border border-white/10">
                    <div className="flex items-start justify-between gap-4 bg-white/[0.04] px-4 py-4 sm:px-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[14.5px] font-semibold text-white">Frais de dossier BailNotarie</span>
                          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            Forfait
                          </span>
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-blue-100/60">
                          Versés à BailNotarie. Remboursés si le dossier n&apos;aboutit pas*.
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="whitespace-nowrap text-[17px] font-bold">39,90 €</div>
                        <div className="text-[11px] text-blue-100/50">TTC</div>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4 bg-white/[0.04] px-4 py-4 sm:px-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[14.5px] font-semibold text-white">Frais notariés</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-blue-100">
                            Tarif d&apos;État
                          </span>
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-blue-100/60">
                          Versés à l&apos;étude notariale, qui rédige et authentifie l&apos;acte.
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="whitespace-nowrap text-[17px] font-bold">≈ {euro(notaryFee)} €</div>
                        <div className="text-[11px] text-blue-100/50">½ loyer HC</div>
                      </div>
                    </div>

                    {/* Total */}
                    {/* Sur petit écran le total passe sous son libellé : côte à
                        côte, les deux se serraient et perdaient leur impact. */}
                    <div className="bg-[#4373f5]/15 px-4 py-4 sm:flex sm:items-end sm:justify-between sm:gap-4 sm:px-5">
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-semibold text-white">Votre bail notarié</div>
                        <p className="mt-1 text-[12.5px] text-blue-100/70">
                          Une seule fois, pour toute la durée du bail.
                        </p>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2 sm:mt-0 sm:block sm:shrink-0 sm:text-right">
                        <div className="whitespace-nowrap text-[30px] font-bold leading-none">
                          ≈ {euro(total, 2).replace(",00", "")} €
                        </div>
                        <div className="text-[11px] text-blue-100/60 sm:mt-1">estimation</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 text-[12px] leading-relaxed text-blue-100/50">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>
                      Estimation indicative. Les frais notariés sont fixés par décret et calculés par l&apos;étude selon
                      votre situation ; une procuration authentique à distance peut s&apos;ajouter (~40 €).
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/commencer"
                      className="group inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#1e3a8a] transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      Constituer mon dossier
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/simulateur-prix-bail-notarie"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                    >
                      <Calculator className="h-4 w-4" />
                      Chiffrer précisément
                    </Link>
                  </div>
                </div>
              </div>
            </Tilt3D>
          </Reveal>

          {/* ---------- Ce que couvrent nos 39,90 € ---------- */}
          <Reveal delay={0.08} className="h-full">
            <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-8">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-blue-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Ce que couvrent nos 39,90 €
              </span>

              <p className="mt-5 text-[15px] leading-relaxed text-blue-100/70">
                Sur les deux lignes de l&apos;addition, une seule nous revient. C&apos;est le prix de tout ce qui vous
                évite les allers-retours avec l&apos;étude :
              </p>

              <ul className="mt-6 grid gap-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14.5px] text-blue-50/85">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <Link
                  href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets"
                  className="group inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#8fb0ff] transition-colors hover:text-white"
                >
                  Comprendre le coût d&apos;un bail notarié
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ---------- Mise en perspective ---------- */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {REASSURANCE.map((item, index) => (
            <Reveal key={item.title} delay={0.06 * index} className="h-full">
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-[#8fb0ff]">
                  <item.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{item.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-blue-100/60">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] text-blue-100/50">
          *Sous conditions, voir{" "}
          <Link href="/cgv" className="underline underline-offset-4 hover:text-blue-100">
            CGV
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
