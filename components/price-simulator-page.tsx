"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, Euro, FileCheck2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TVA_RATE = 0.2;
const PROCURATION_UNIT_HT = 20;

const SIMULATOR_HIGHLIGHTS = [
  {
    title: "Base d'emoluments",
    description: "Le calcul part d'une base egale a 50% du loyer mensuel hors charges.",
  },
  {
    title: "Procurations",
    description: `Chaque procuration ajoute ${PROCURATION_UNIT_HT} EUR HT au montant estime.`,
  },
  {
    title: "TVA",
    description: "La TVA de 20% est appliquee au total HT obtenu par le simulateur.",
  },
];

const SIMULATOR_FAQS = [
  {
    question: "Quel est le prix d'un bail notarie ?",
    answer:
      "Le prix depend surtout du loyer hors charges et des procurations. Cette page donne une estimation TTC immediate pour un bail notarie d'habitation.",
  },
  {
    question: "Combien coute un bail de location chez un notaire ?",
    answer:
      "Pour une location d'habitation, on raisonne souvent a partir d'une base proche d'un demi-loyer hors charges, a laquelle s'ajoutent ici les procurations et la TVA.",
  },
  {
    question: "Comment est calcule le tarif du bail notarie ?",
    answer:
      "Le simulateur affiche la base d'emoluments, le cout des procurations, la TVA et le total TTC. Il ne rajoute pas de frais de dossier dans ce calcul.",
  },
];

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

  const simulation = useMemo(() => {
    const baseEmoluments = rent * 0.5;
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
            <Badge className="border-blue-200 bg-blue-100 text-blue-700">Estimation en ligne • Cout TTC</Badge>
            <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
              Simulateur prix bail notarie d&apos;habitation
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-600 sm:text-base md:text-lg">
              Estimez le cout d&apos;un bail notarie selon le <strong>loyer hors charges</strong>, le
              <strong> nombre de procurations</strong> et le <strong>nombre de personnes au bail</strong>.
              Vous obtenez immediatement une estimation du prix TTC, de la base d&apos;emoluments et du cout moyen par signataire.
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <Card className="border-blue-100 shadow-sm lg:hidden">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 sm:text-xl">
                  {showMobileResult ? (
                    <>
                      <Euro className="h-5 w-5 text-blue-600" /> Resultat estime
                    </>
                  ) : (
                    <>
                      <Calculator className="h-5 w-5 text-blue-600" /> Parametres
                    </>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                {!showMobileResult ? (
                  <div className="space-y-4 sm:space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="rent-mobile">Montant du loyer mensuel hors charges (EUR)</Label>
                      <Input
                        id="rent-mobile"
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={rent}
                        onChange={(e) => setRent(Number(e.target.value) || 0)}
                        className="h-11 text-base"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="procurations-mobile">Nombre de procurations</Label>
                        <Input
                          id="procurations-mobile"
                          type="number"
                          min={0}
                          max={10}
                          value={procurations}
                          onChange={(e) => setProcurations(Number(e.target.value) || 0)}
                          className="h-11 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="people-mobile">Nombre de personnes au bail</Label>
                        <Input
                          id="people-mobile"
                          type="number"
                          min={1}
                          max={20}
                          value={peopleOnLease}
                          onChange={(e) => setPeopleOnLease(Math.max(1, Number(e.target.value) || 1))}
                          className="h-11 text-base"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                      Cette estimation repose sur le loyer, les procurations et la TVA. Le montant final reste confirme au moment du traitement notarial.
                    </div>

                    <Button className="h-11 w-full" onClick={() => setShowMobileResult(true)}>
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
                      aria-label="Retour aux parametres"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className="rounded-2xl bg-slate-900 p-4 text-white">
                      <p className="text-xs uppercase tracking-wide text-blue-100">Prix estimatif TTC</p>
                      <p className="mt-1 text-3xl font-bold">{formatCurrency(simulation.totalTtc)}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-slate-500">Base emoluments</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(simulation.baseEmoluments)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-slate-500">
                          Procurations ({procurations} × {PROCURATION_UNIT_HT} EUR HT)
                        </p>
                        <p className="font-semibold text-slate-900">{formatCurrency(simulation.procurationCost)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-slate-500">TVA (20%)</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(simulation.tva)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <Users className="h-4 w-4 text-blue-600" />
                        Cout moyen par personne au bail
                      </p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(simulation.splitPerPerson)}</p>
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
                  <Calculator className="h-5 w-5 text-blue-600" /> Parametres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="rent">Montant du loyer mensuel hors charges (EUR)</Label>
                  <Input
                    id="rent"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value) || 0)}
                    className="h-11 text-base"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="procurations">Nombre de procurations</Label>
                    <Input
                      id="procurations"
                      type="number"
                      min={0}
                      max={10}
                      value={procurations}
                      onChange={(e) => setProcurations(Number(e.target.value) || 0)}
                      className="h-11 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="people">Nombre de personnes au bail</Label>
                    <Input
                      id="people"
                      type="number"
                      min={1}
                      max={20}
                      value={peopleOnLease}
                      onChange={(e) => setPeopleOnLease(Math.max(1, Number(e.target.value) || 1))}
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  Cette estimation repose sur le loyer, les procurations et la TVA. Le montant final reste confirme au moment du traitement notarial.
                </div>
              </CardContent>
            </Card>

            <Card className="hidden border-blue-100 bg-white shadow-sm lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 sm:text-xl">
                  <Euro className="h-5 w-5 text-blue-600" /> Resultat estime
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-900 p-4 text-white sm:p-5">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Prix estimatif TTC</p>
                  <p className="mt-1 text-3xl font-bold sm:text-4xl">{formatCurrency(simulation.totalTtc)}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">Base emoluments</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(simulation.baseEmoluments)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">
                      Procurations ({procurations} × {PROCURATION_UNIT_HT} EUR HT)
                    </p>
                    <p className="font-semibold text-slate-900">{formatCurrency(simulation.procurationCost)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">TVA (20%)</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(simulation.tva)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Users className="h-4 w-4 text-blue-600" />
                    Cout moyen par personne au bail
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(simulation.splitPerPerson)}</p>
                </div>

                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0" />
                  Estimation indicative calculee automatiquement. Le montant exact est confirme au moment du traitement notarial.
                </div>

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
                <CardTitle className="text-xl text-slate-900">Comment est calcule le prix d&apos;un bail notarie ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-slate-700 sm:text-base">
                <p>
                  Le simulateur vise une lecture immediate du cout d&apos;un bail notarie d&apos;habitation.
                  Il met en avant les postes que l&apos;utilisateur cherche le plus souvent a comprendre avant de lancer son dossier.
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
                  <p className="text-sm font-semibold text-slate-900">Formule utilisee</p>
                  <p className="mt-2 text-sm text-slate-700 sm:text-base">
                    Prix estime TTC = (0,5 x loyer mensuel hors charges + procurations) + TVA.
                  </p>
                  <p className="mt-2 text-sm text-slate-700 sm:text-base">
                    Cette estimation ne rajoute pas de frais de dossier et reste indicative jusqu&apos;a validation finale du dossier notarial.
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
                  Si vous voulez aller au-dela de la simulation, vous pouvez consulter le detail
                  du cout d&apos;un bail notarie puis lancer directement la constitution du dossier.
                </p>

                <div className="space-y-3">
                  <Link
                    href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets"
                    className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="font-semibold text-slate-900">Voir le detail du prix d&apos;un bail notarie</p>
                    <p className="mt-1 text-sm text-slate-600">Tarifs, partage des frais et exemples concrets.</p>
                  </Link>

                  <Link
                    href="/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet"
                    className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="font-semibold text-slate-900">Comprendre les etapes du bail notarie</p>
                    <p className="mt-1 text-sm text-slate-600">Checklist, verification du dossier et signature.</p>
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
                Questions frequentes sur le cout du bail notarie
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
                Reponses rapides pour les recherches les plus courantes autour du prix, du cout et du tarif du bail notarie.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
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
