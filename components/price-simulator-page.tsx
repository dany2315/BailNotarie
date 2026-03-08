"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Euro, FileCheck2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TVA_RATE = 0.2;
const PROCURATION_UNIT_HT = 40;

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
    const adminPackage = 45 + peopleOnLease * 12;

    const subtotalHt = baseEmoluments + procurationCost + adminPackage;
    const tva = subtotalHt * TVA_RATE;
    const totalTtc = subtotalHt + tva;

    const splitPerPerson = peopleOnLease > 0 ? totalTtc / peopleOnLease : totalTtc;

    return {
      baseEmoluments,
      procurationCost,
      adminPackage,
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
          <div className="mb-8 text-center md:mb-10">
            <Badge className="border-blue-200 bg-blue-100 text-blue-700">Simple • Rapide • Mobile friendly</Badge>
            <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
              Simulateur du prix d&apos;un bail notarié
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-600 sm:text-base md:text-lg">
              Saisissez uniquement les informations clés pour obtenir une estimation du prix de votre bail :
              <strong> loyer</strong>, <strong>nombre de procurations</strong> et <strong>nombre de personnes inscrites au bail</strong>.
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <Card className="border-blue-100 shadow-sm lg:hidden">
              <CardHeader className="pb-3">
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

              <CardContent>
                <div className="relative min-h-[480px] overflow-hidden">
                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-out ${
                      showMobileResult
                        ? "translate-x-[-12px] opacity-0 pointer-events-none"
                        : "translate-x-0 opacity-100"
                    }`}
                  >
                    <div className="space-y-4 sm:space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="rent-mobile">Montant du loyer mensuel hors charges (€)</Label>
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
                        Cette simulation calcule une estimation à partir des paramètres demandés. Le devis final peut varier selon le dossier notarial.
                      </div>

                      <Button className="h-11 w-full" onClick={() => setShowMobileResult(true)}>
                        Voir mon estimation
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-out ${
                      showMobileResult
                        ? "translate-x-0 opacity-100"
                        : "translate-x-[12px] opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-slate-900 p-4 text-white">
                        <p className="text-xs uppercase tracking-wide text-blue-100">Prix estimatif TTC</p>
                        <p className="mt-1 text-3xl font-bold">{formatCurrency(simulation.totalTtc)}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border p-3">
                          <p className="text-xs text-slate-500">Base émoluments</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(simulation.baseEmoluments)}</p>
                        </div>
                        <div className="rounded-xl border p-3">
                          <p className="text-xs text-slate-500">Procurations ({procurations} × 40€ HT)</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(simulation.procurationCost)}</p>
                        </div>
                        <div className="rounded-xl border p-3">
                          <p className="text-xs text-slate-500">Forfait dossier (selon personnes)</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(simulation.adminPackage)}</p>
                        </div>
                        <div className="rounded-xl border p-3">
                          <p className="text-xs text-slate-500">TVA (20%)</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(simulation.tva)}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <Users className="h-4 w-4 text-blue-600" />
                          Coût moyen par personne au bail
                        </p>
                        <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(simulation.splitPerPerson)}</p>
                      </div>

                      <Button variant="outline" className="h-11 w-full" onClick={() => setShowMobileResult(false)}>
                        Modifier les informations
                      </Button>

                      <Button asChild className="h-11 w-full">
                        <Link href="/commencer">
                          Lancer mon dossier
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hidden border-blue-100 shadow-sm lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 sm:text-xl">
                  <Calculator className="h-5 w-5 text-blue-600" /> Paramètres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="rent">Montant du loyer mensuel hors charges (€)</Label>
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
                  Cette simulation calcule une estimation à partir des paramètres demandés. Le devis final peut varier selon le dossier notarial.
                </div>
              </CardContent>
            </Card>

            <Card className="hidden border-blue-100 bg-white shadow-sm lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 sm:text-xl">
                  <Euro className="h-5 w-5 text-blue-600" /> Résultat estimé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-900 p-4 sm:p-5 text-white">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Prix estimatif TTC</p>
                  <p className="mt-1 text-3xl font-bold sm:text-4xl">{formatCurrency(simulation.totalTtc)}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">Base émoluments</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(simulation.baseEmoluments)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">Procurations ({procurations} × 40€ HT)</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(simulation.procurationCost)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">Forfait dossier (selon personnes)</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(simulation.adminPackage)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">TVA (20%)</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(simulation.tva)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Users className="h-4 w-4 text-blue-600" />
                    Coût moyen par personne au bail
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(simulation.splitPerPerson)}</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
                  <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0" />
                  Estimation indicative calculée automatiquement. Le montant exact est confirmé au moment du traitement notarial.
                </div>

                <Button asChild className="h-11 w-full">
                  <Link href="/commencer">
                    Lancer mon dossier
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
