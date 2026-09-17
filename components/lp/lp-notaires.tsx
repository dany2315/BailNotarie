"use client";

import { Building2, Handshake, Info, MapPin, ShieldCheck, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal, SectionLabel, Tilt3D } from "./ui/lp-primitives";

/* Positions en pourcentage dans le cadre du radar. Réparties sur les anneaux
   pour évoquer une couverture nationale sans prétendre à une carte exacte. */
const CITIES = [
  { name: "Paris", top: "18%", left: "52%", delay: 0 },
  { name: "Lille", top: "8%", left: "68%", delay: 0.4 },
  { name: "Rennes", top: "34%", left: "22%", delay: 0.8 },
  { name: "Lyon", top: "56%", left: "70%", delay: 1.2 },
  { name: "Bordeaux", top: "68%", left: "28%", delay: 1.6 },
  { name: "Marseille", top: "82%", left: "62%", delay: 2 },
  { name: "Nantes", top: "50%", left: "12%", delay: 2.4 },
  { name: "Strasbourg", top: "26%", left: "86%", delay: 2.8 },
];

const POINTS = [
  {
    icon: Handshake,
    title: "Nous travaillons avec des notaires",
    text: "BailNotarie n'est pas un office notarial. Nous assurons un accompagnement administratif et transmettons les dossiers aux notaires compétents, seuls habilités à rédiger et authentifier les actes.",
  },
  {
    icon: ShieldCheck,
    title: "Acte authentique garanti",
    text: "Votre bail est authentifié par un notaire partenaire, ce qui lui confère la valeur d'acte authentique et sa force exécutoire.",
  },
  {
    icon: Users,
    title: "Réseau de notaires certifiés",
    text: "Plus de 150 notaires partenaires à travers la France, spécialisés en droit immobilier, quelle que soit la localisation du bien.",
  },
];

export function LpNotaires() {
  const reduce = useReducedMotion();

  return (
    <section
      id="notaires"
      aria-labelledby="lp-notaires-title"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#f7f9ff] to-white py-24 sm:py-32"
    >
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          {/* ---------- Radar ---------- */}
          <Reveal className="order-2 lg:order-1">
            <Tilt3D intensity={9} lift={20} glare={false}>
              <div className="relative mx-auto aspect-square w-full max-w-[460px]">
                {/* Anneaux */}
                {[1, 0.74, 0.48, 0.24].map((scale, index) => (
                  <motion.div
                    key={index}
                    initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#4373f5]/15"
                    style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
                  />
                ))}

                {/* Halo central */}
                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4373f5]/12 blur-3xl"
                />

                {/* Noyau : la plateforme */}
                <div className="absolute left-1/2 top-1/2 z-20 flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-3xl border border-white bg-white text-center shadow-[0_24px_60px_-24px_rgba(30,58,138,0.6)]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4373f5] to-[#3563e9] text-[12px] font-bold text-white">
                    BN
                  </span>
                  <span className="mt-1.5 text-[10px] font-semibold text-slate-500">Plateforme</span>
                </div>

                {/* Villes */}
                {CITIES.map((city) => (
                  <motion.div
                    key={city.name}
                    initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + city.delay * 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                    style={{ top: city.top, left: city.left }}
                  >
                    <div className="flex items-center gap-1.5 rounded-full border border-white/90 bg-white/90 py-1 pl-1.5 pr-2.5 shadow-[0_10px_28px_-16px_rgba(30,58,138,0.7)] backdrop-blur">
                      <span
                        className="lp-ping relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4373f5] text-[#4373f5]"
                        style={{ animationDelay: `${city.delay}s` }}
                      >
                        <span className="h-1 w-1 rounded-full bg-white" />
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700">{city.name}</span>
                    </div>
                  </motion.div>
                ))}

                {/* Badge de couverture */}
                <div className="absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-white bg-white px-4 py-2.5 text-center shadow-[0_20px_50px_-24px_rgba(30,58,138,0.7)]">
                  <div className="text-[20px] font-bold leading-none text-slate-900">150+</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">notaires partenaires en France</div>
                </div>
              </div>
            </Tilt3D>
          </Reveal>

          {/* ---------- Texte ---------- */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <SectionLabel icon={Building2}>Notre approche</SectionLabel>
              <h2
                id="lp-notaires-title"
                className="lp-title lp-balance mt-6 text-4xl font-bold text-slate-900 sm:text-[3.1rem]"
              >
                Nous travaillons <span className="lp-gradient-text">avec des notaires</span>
              </h2>
              <p className="lp-balance mt-5 text-lg leading-relaxed text-slate-600">
                BailNotarie facilite votre démarche en ligne, puis transmet votre dossier à un notaire partenaire qui
                authentifie votre bail. Vous bénéficiez de la simplicité du digital et de la garantie de l&apos;acte
                authentique.
              </p>
            </Reveal>

            <div className="mt-9 space-y-6">
              {POINTS.map((point, index) => (
                <Reveal key={point.title} delay={0.08 * index}>
                  <div className="group flex gap-4">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#3563e9] shadow-[0_8px_20px_-14px_rgba(30,58,138,0.8)] transition-colors duration-300 group-hover:border-[#4373f5]/30">
                      <point.icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="text-[16px] font-semibold text-slate-900">{point.title}</h3>
                      <p className="mt-1.5 text-[14.5px] leading-relaxed text-slate-600">{point.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.24}>
              <div className="mt-9 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="text-[13px] leading-relaxed text-slate-500">
                  Les frais notariés sont fixés par l&apos;État et facturés directement par l&apos;étude notariale. Ils
                  sont indépendants des frais de dossier BailNotarie.
                </p>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Bandeau de couverture */}
        <Reveal delay={0.1}>
          <div className="lp-fade-x lp-marquee-paused mt-16 overflow-hidden">
            <div className="lp-marquee-track flex w-max gap-3" style={{ ["--lp-duration" as string]: "38s" }}>
              {[...Array(2)].map((_, copy) => (
                <div key={copy} className="flex gap-3" aria-hidden={copy === 1}>
                  {[
                    "Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nantes", "Nice",
                    "Strasbourg", "Rennes", "Montpellier", "Grenoble", "Rouen", "Reims",
                  ].map((city) => (
                    <span
                      key={`${copy}-${city}`}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#4373f5]" />
                      {city}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
