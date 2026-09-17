"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileText, PenTool, Phone, Send, Workflow } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  AppFrame,
  DocumentsMockup,
  SignatureMockup,
  SuiviMockup,
} from "./ui/lp-product-mockups";
import { Reveal, SectionLabel, Tilt3D } from "./ui/lp-primitives";

const STEPS = [
  {
    number: "01",
    icon: FileText,
    title: "Constitution du dossier 100% en ligne",
    description:
      "Vous remplissez votre dossier de bail d'habitation directement en ligne, en quelques minutes. Les pièces sont vérifiées au fil de l'eau.",
    bullets: ["Formulaire guidé, sauvegarde automatique", "Dépôt des pièces justificatives", "Vérification des documents"],
    accent: "#4373f5",
    preview: <DocumentsMockup compact />,
    url: "bailnotarie.fr/commencer",
  },
  {
    number: "02",
    icon: Send,
    title: "Transmission automatique au notaire",
    description:
      "BailNotarie transmet votre dossier complet au notaire partenaire pour vérification et préparation de l'acte notarié. Vous suivez chaque étape en temps réel.",
    bullets: ["Transmission sécurisée et instantanée", "Rédaction de l'acte authentique", "Suivi en temps réel"],
    accent: "#6366f1",
    preview: <SuiviMockup compact />,
    url: "bailnotarie.fr/client/suivi",
  },
  {
    number: "03",
    icon: PenTool,
    title: "Signature en ligne avec le notaire",
    description:
      "Vous signez votre bail notarié en visioconférence avec le notaire. L'acte authentique vous est remis avec force exécutoire immédiate.",
    bullets: ["Visioconférence sécurisée", "Acte authentique signé", "Force exécutoire immédiate"],
    accent: "#10b981",
    preview: <SignatureMockup compact />,
    url: "bailnotarie.fr/client/signature",
  },
];

export function LpProcess() {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 60%"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="processus"
      aria-labelledby="lp-process-title"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#f7f9ff] via-white to-[#f7f9ff] py-24 sm:py-32"
    >
      <div aria-hidden className="lp-grid absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel icon={Workflow}>Comment ça marche</SectionLabel>
          <h2 id="lp-process-title" className="lp-title lp-balance mt-6 text-4xl font-bold text-slate-900 sm:text-[3.25rem]">
            Votre bail notarié en <span className="lp-gradient-text">3 étapes simples</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Un processus 100% en ligne, rapide et sécurisé. De la constitution de votre dossier à la signature, tout se
            fait en ligne.
          </p>
        </Reveal>

        <div ref={ref} className="relative mt-16">
          {/* Ligne de progression qui se remplit au scroll */}
          <div aria-hidden className="absolute inset-x-[16%] top-[58px] hidden h-px bg-slate-200 lg:block">
            <motion.div
              style={reduce ? { scaleX: 1 } : { scaleX: lineScale }}
              className="h-full origin-left bg-gradient-to-r from-[#4373f5] via-[#6366f1] to-emerald-500"
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
            {STEPS.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.12}>
                <div className="relative flex h-full flex-col">
                  {/* Pastille numérotée */}
                  <div className="relative z-10 mb-6 flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_14px_30px_-14px_rgba(30,58,138,0.9)]"
                      style={{ background: `linear-gradient(140deg, ${step.accent}, ${step.accent}dd)` }}
                    >
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="text-[34px] font-bold leading-none tracking-tight text-slate-200">
                      {step.number}
                    </span>
                  </div>

                  {/* Aperçu produit incliné */}
                  <Tilt3D intensity={7} lift={18} className="mb-6">
                    <div className="relative">
                      <div
                        aria-hidden
                        className="absolute -inset-3 rounded-[26px] opacity-40 blur-2xl"
                        style={{ background: `linear-gradient(160deg, ${step.accent}55, transparent 70%)` }}
                      />
                      <AppFrame url={step.url} className="relative" bodyClassName="max-h-[290px] overflow-hidden">
                        {step.preview}
                      </AppFrame>
                      {/* Dégradé de coupe : l'écran « continue » sous le pli */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-[20px] bg-gradient-to-t from-white to-transparent"
                      />
                    </div>
                  </Tilt3D>

                  <h3 className="text-xl font-semibold leading-snug text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{step.description}</p>

                  <ul className="mt-5 space-y-2.5">
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                        <span
                          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: step.accent }}
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Appel à l'action */}
        <Reveal delay={0.1}>
          <div className="lp-ring-gradient relative mt-20 overflow-hidden rounded-3xl bg-white p-8 text-center shadow-[0_30px_80px_-40px_rgba(30,58,138,0.5)] sm:p-12">
            <div aria-hidden className="lp-mesh absolute inset-0 opacity-60" />
            <div className="relative">
              <h3 className="lp-title text-2xl font-bold text-slate-900 sm:text-3xl">
                Prêt à constituer votre dossier ?
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
                Commencez dès maintenant : votre dossier sera transmis automatiquement au notaire partenaire.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/commencer"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_14px_36px_-14px_rgba(53,99,233,1)] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Commencer maintenant
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a
                  href="tel:0749387756"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-[15px] font-semibold text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9]"
                >
                  <Phone className="h-4 w-4 text-[#4373f5]" />
                  07 49 38 77 56
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
