"use client";

import { LpNav } from "@/components/lp/lp-nav";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, Euro, FileCheck2, Home, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDossierFee } from "@/lib/utils/dossier-fee";

const TVA_RATE = 0.2;
const PROCURATION_UNIT_HT = 20;

const SIMULATOR_HIGHLIGHTS = [
  {
    title: "Base d'émoluments",
    description: "Le calcul part d'une base égale à 50 % du loyer mensuel hors charges.",
  },
  {
    title: "Procurations",
    description: `Chaque procuration ajoute ${PROCURATION_UNIT_HT} € HT au montant estimé.`,
  },
  {
    title: "TVA",
    description: "La TVA de 20 % est appliquée au total HT obtenu par le simulateur.",
  },
];

const SIMULATOR_FAQS = [
  {
    question: "Quel est le prix d'un bail notarié ?",
    answer:
      "Le prix dépend surtout du loyer hors charges et des procurations. Cette page donne une estimation TTC immédiate pour un bail notarié d'habitation.",
  },
  {
    question: "Combien coûte un bail de location chez un notaire ?",
    answer:
      "Pour une location d'habitation, on raisonne souvent à partir d'une base proche d'un demi-loyer hors charges, à laquelle s'ajoutent ici les procurations et la TVA.",
  },
  {
    question: "Et pour un bail commercial ?",
    answer:
      "Le tarif réglementé des notaires ne couvre que le bail d'habitation. Pour un bail commercial, les honoraires sont libres : le notaire les fixe selon le dossier et les communique avant la signature. Les frais de dossier BailNotarie sont de 59,90 € TTC.",
  },
  {
    question: "Comment est calculé le tarif du bail notarié ?",
    answer:
      "Le simulateur affiche la base d'émoluments, le coût des procurations, la TVA et le total TTC. Il ne rajoute pas de frais de dossier dans ce calcul.",
  },
];

type Usage = "HABITATION" | "COMMERCIAL";

/** Logement ou local commercial : le second n'a pas de barème réglementé. */
function UsageToggle({ usage, onChange }: { usage: Usage; onChange: (usage: Usage) => void }) {
  const options = [
    { value: "HABITATION" as const, label: "Logement", hint: "Bail d'habitation", icon: Home },
    { value: "COMMERCIAL" as const, label: "Local commercial", hint: "Bail commercial", icon: Store },
  ];
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type de bail">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = usage === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-colors",
              selected ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-blue-600" : "text-slate-400")} />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{option.label}</span>
              <span className="block text-xs text-slate-500">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Bail commercial : honoraires libres, donc pas de montant estimé. */
function CommercialNotice() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-slate-900 p-4 text-white sm:p-5">
        <p className="text-xs uppercase tracking-wide text-blue-100">Honoraires du notaire</p>
        <p className="mt-1 text-xl font-bold sm:text-2xl">Fixés par l&apos;étude notariale</p>
      </div>
      <p className="text-sm text-slate-700">
        Le tarif réglementé des notaires ne couvre que le bail d&apos;habitation. Pour un bail commercial, les honoraires
        sont libres : le notaire les fixe selon le dossier et vous les communique avant la signature.
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">Frais de dossier BailNotarie (bail commercial)</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{formatDossierFee("COMMERCIAL")} TTC</p>
        <p className="mt-1 text-xs text-slate-500">Payés à la fin du formulaire, remboursés si le dossier n&apos;aboutit pas.</p>
      </div>
    </div>
  );
}

const MAX_PROCURATIONS = 10;
const MAX_PEOPLE = 20;
const RENT_INVALID = "Indiquez un loyer supérieur à 0 €.";

/** Nombre saisi ramené entre deux bornes (vide ou illisible : la borne basse). */
function clampInput(value: string, min: number, max: number) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);

export function PriceSimulatorPage() {
  const [rent, setRent] = useState(950);
  const [procurations, setProcurations] = useState(1);
  const [peopleOnLease, setPeopleOnLease] = useState(2);
  const [showMobileResult, setShowMobileResult] = useState(false);
  const [usage, setUsage] = useState<Usage>("HABITATION");
  const isCommercial = usage === "COMMERCIAL";
  // Un loyer nul ou négatif ne donne pas de prix : on l'indique au lieu d'afficher un montant négatif.
  const rentInvalid = !(rent > 0);
  const money = (value: number) => (rentInvalid ? "—" : formatCurrency(value));

  const simulation = useMemo(() => {
    const baseEmoluments = Math.max(0, rent) * 0.5;
    const procurationCost = procurations * PROCURATION_UNIT_HT;
    const subtotalHt = baseEmoluments + procurationCost;
    const tva = subtotalHt * TVA_RATE;
    const totalTtc = subtotalHt + tva;
    const splitPerPerson = peopleOnLease > 0 ? totalTtc / peopleOnLease : totalTtc;

    return {
      baseEmoluments,
      procurationCost,
      subtotalHt,
      tva,
      totalTtc,
      splitPerPerson,
    };
  }, [rent, procurations, peopleOnLease]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white">
      {/* Dans le conteneur qui porte le fond, pour qu'il remonte derrière la
          barre flottante au lieu de laisser voir celui du document. */}
      <LpNav />
      <section className="py-10 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Link href="/" className="transition-colors hover:text-blue-700">
              Accueil
            </Link>
            <span>/</span>
            <span className="text-slate-700">Simulateur de prix</span>
          </nav>

          <div className="mb-8 text-center md:mb-10">
            <Badge className="border-blue-200 bg-blue-100 text-blue-700">Estimation en ligne • Coût TTC</Badge>
            <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
              Simulateur de prix du bail notarié d&apos;habitation
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-600 sm:text-base md:text-lg">
              Estimez le coût d&apos;un bail notarié selon le <strong>loyer hors charges</strong>, le
              <strong> nombre de procurations</strong> et le <strong>nombre de personnes au bail</strong>.
              Vous obtenez immédiatement une estimation du prix TTC, de la base d&apos;émoluments et du coût moyen par signataire.
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <Card className="border-blue-100 shadow-sm lg:hidden">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 sm:text-xl">
                  {showMobileResult ? (
                    <>
                      <Euro className="h-5 w-5 text-blue-600" /> Résultat estimé
                    </>
                  ) : (
                    <>
                      <Calculator className="h-5 w-5 text-blue-600" /> Paramètres
                    </>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                {isCommercial ? (
                  <div className="space-y-4">
                    <UsageToggle usage={usage} onChange={setUsage} />
                    <CommercialNotice />
                    <Button asChild className="h-11 w-full">
                      <Link href="/commencer">
                        Constituer mon dossier
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : !showMobileResult ? (
                  <div className="space-y-4 sm:space-y-5">
                    <UsageToggle usage={usage} onChange={setUsage} />
                    <div className="space-y-2">
                      <Label htmlFor="rent-mobile">Montant du loyer mensuel hors charges (€)</Label>
                      <Input
                        id="rent-mobile"
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={rent}
                        onChange={(e) => setRent(Number(e.target.value) || 0)}
                        aria-invalid={rentInvalid}
                        className="h-11 text-base"
                      />
                      {rentInvalid && <p className="text-sm text-destructive">{RENT_INVALID}</p>}
                      <p className="text-xs text-slate-500">De 0 à {MAX_PROCURATIONS} procurations, de 1 à {MAX_PEOPLE} personnes.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="procurations-mobile">Nombre de procurations</Label>
                        <Input
                          id="procurations-mobile"
                          type="number"
                          min={0}
                          max={MAX_PROCURATIONS}
                          value={procurations}
                          onChange={(e) => setProcurations(clampInput(e.target.value, 0, MAX_PROCURATIONS))}
                          className="h-11 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="people-mobile">Nombre de personnes au bail</Label>
                        <Input
                          id="people-mobile"
                          type="number"
                          min={1}
                          max={MAX_PEOPLE}
                          value={peopleOnLease}
                          onChange={(e) => setPeopleOnLease(clampInput(e.target.value, 1, MAX_PEOPLE))}
                          className="h-11 text-base"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                      Cette estimation repose sur le loyer, les procurations et la TVA. Le montant final reste confirmé au moment du traitement notarial.
                    </div>

                    <Button className="h-11 w-full" disabled={rentInvalid} onClick={() => setShowMobileResult(true)}>
                      Voir mon estimation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-ml-2 h-8 w-8"
                      onClick={() => setShowMobileResult(false)}
                      aria-label="Retour aux paramètres"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className="rounded-2xl bg-slate-900 p-4 text-white">
                      <p className="text-xs uppercase tracking-wide text-blue-100">Prix estimatif TTC</p>
                      <p className="mt-1 text-3xl font-bold">{money(simulation.totalTtc)}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-slate-500">Base d'émoluments</p>
                        <p className="font-semibold text-slate-900">{money(simulation.baseEmoluments)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-slate-500">
                          Procurations ({procurations} × {PROCURATION_UNIT_HT} € HT)
                        </p>
                        <p className="font-semibold text-slate-900">{money(simulation.procurationCost)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-slate-500">TVA (20 %)</p>
                        <p className="font-semibold text-slate-900">{money(simulation.tva)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <Users className="h-4 w-4 text-blue-600" />
                        Coût moyen par personne au bail
                      </p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{money(simulation.splitPerPerson)}</p>
                    </div>

                    <Button asChild className="h-11 w-full">
                      <Link href="/commencer">
                        Constituer mon dossier
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hidden border-blue-100 shadow-sm lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 sm:text-xl">
                  <Calculator className="h-5 w-5 text-blue-600" /> Paramètres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5">
                <UsageToggle usage={usage} onChange={setUsage} />
                {!isCommercial && (
                <>
                <div className="space-y-2">
                  <Label htmlFor="rent">Montant du loyer mensuel hors charges (€)</Label>
                  <Input
                    id="rent"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value) || 0)}
                        aria-invalid={rentInvalid}
                    className="h-11 text-base"
                  />
                  {rentInvalid && <p className="text-sm text-destructive">{RENT_INVALID}</p>}
                  <p className="text-xs text-slate-500">De 0 à {MAX_PROCURATIONS} procurations, de 1 à {MAX_PEOPLE} personnes.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="procurations">Nombre de procurations</Label>
                    <Input
                      id="procurations"
                      type="number"
                      min={0}
                      max={MAX_PROCURATIONS}
                      value={procurations}
                      onChange={(e) => setProcurations(clampInput(e.target.value, 0, MAX_PROCURATIONS))}
                      className="h-11 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="people">Nombre de personnes au bail</Label>
                    <Input
                      id="people"
                      type="number"
                      min={1}
                      max={MAX_PEOPLE}
                      value={peopleOnLease}
                      onChange={(e) => setPeopleOnLease(clampInput(e.target.value, 1, MAX_PEOPLE))}
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  Cette estimation repose sur le loyer, les procurations et la TVA. Le montant final reste confirmé au moment du traitement notarial.
                </div>
                </>
                )}
                {isCommercial && (
                  <p className="text-sm text-slate-600">
                    Pas de calcul pour un local commercial : les honoraires du notaire ne suivent pas de barème.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="hidden border-blue-100 bg-white shadow-sm lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 sm:text-xl">
                  <Euro className="h-5 w-5 text-blue-600" /> Résultat estimé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isCommercial ? (
                  <CommercialNotice />
                ) : (
                <>
                <div className="rounded-2xl bg-slate-900 p-4 text-white sm:p-5">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Prix estimatif TTC</p>
                  <p className="mt-1 text-3xl font-bold sm:text-4xl">{money(simulation.totalTtc)}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">Base d'émoluments</p>
                    <p className="font-semibold text-slate-900">{money(simulation.baseEmoluments)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">
                      Procurations ({procurations} × {PROCURATION_UNIT_HT} € HT)
                    </p>
                    <p className="font-semibold text-slate-900">{money(simulation.procurationCost)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">TVA (20 %)</p>
                    <p className="font-semibold text-slate-900">{money(simulation.tva)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Users className="h-4 w-4 text-blue-600" />
                    Coût moyen par personne au bail
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{money(simulation.splitPerPerson)}</p>
                </div>

                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0" />
                  Estimation indicative calculée automatiquement. Le montant exact est confirmé au moment du traitement notarial.
                </div>
                </>
                )}

                <Button asChild className="h-11 w-full">
                  <Link href="/commencer">
                    Constituer mon dossier
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-slate-900">Comment est calculé le prix d&apos;un bail notarié ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-slate-700 sm:text-base">
                <p>
                  Le simulateur vise une lecture immédiate du coût d&apos;un bail notarié d&apos;habitation.
                  Il met en avant les postes que l&apos;utilisateur cherche le plus souvent à comprendre avant de lancer son dossier.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  {SIMULATOR_HIGHLIGHTS.map((item) => (
                    <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Formule utilisée</p>
                  <p className="mt-2 text-sm text-slate-700 sm:text-base">
                    Prix estimé TTC = (0,5 × loyer mensuel hors charges + procurations) + TVA.
                  </p>
                  <p className="mt-2 text-sm text-slate-700 sm:text-base">
                    Cette estimation ne rajoute pas de frais de dossier et reste indicative jusqu&apos;à validation finale du dossier notarial.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-slate-900">Aller plus loin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700 sm:text-base">
                <p>
                  Si vous voulez aller au-delà de la simulation, vous pouvez consulter le détail
                  du coût d&apos;un bail notarié puis lancer directement la constitution du dossier.
                </p>

                <div className="space-y-3">
                  <Link
                    href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets"
                    className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="font-semibold text-slate-900">Voir le détail du prix d&apos;un bail notarié</p>
                    <p className="mt-1 text-sm text-slate-600">Tarifs, partage des frais et exemples concrets.</p>
                  </Link>

                  <Link
                    href="/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet"
                    className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="font-semibold text-slate-900">Comprendre les étapes du bail notarié</p>
                    <p className="mt-1 text-sm text-slate-600">Liste des pièces, vérification du dossier et signature.</p>
                  </Link>
                </div>

                <Button asChild className="h-11 w-full">
                  <Link href="/commencer">
                    Constituer mon dossier
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="mt-6">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Questions fréquentes sur le coût du bail notarié
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
                Réponses rapides aux questions les plus courantes sur le prix, le coût et le tarif du bail notarié.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {SIMULATOR_FAQS.map((faq) => (
                <Card key={faq.question} className="border-blue-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base leading-6 text-slate-900">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
