"use client";

import * as React from "react";
import Image from "next/image";
import { Award, MapPin, Quote, Star } from "lucide-react";
import { Reveal, SectionLabel } from "./ui/lp-primitives";
import { cn } from "@/lib/utils";

const TESTIMONIALS = [
  {
    name: "Marie Dubois",
    role: "Propriétaire depuis 8 ans",
    image:
      "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Excellent service ! Le processus était simple et rapide. Mon bail notarié m'a permis de récupérer rapidement les loyers impayés sans passer par un long procès. Je recommande vivement !",
    location: "Paris 15ème",
    highlight: "Récupération rapide des impayés",
  },
  {
    name: "Thomas Martin",
    role: "Investisseur immobilier",
    image:
      "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Je recommande vivement BailNotarie. La sécurité juridique apportée par le bail notarié est incomparable. L'équipe est professionnelle et réactive.",
    location: "Lyon 6ème",
    highlight: "Sécurité juridique maximale",
  },
  {
    name: "Sophie Leroy",
    role: "Propriétaire particulier",
    image:
      "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Grâce au bail notarié, j'ai une tranquillité d'esprit totale. En cas de problème, je sais que j'ai un document avec force exécutoire immédiate.",
    location: "Marseille 8ème",
    highlight: "Tranquillité d'esprit garantie",
  },
  {
    name: "Pierre Durand",
    role: "Propriétaire bailleur",
    image:
      "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Service impeccable ! L'accompagnement était parfait du début à la fin. Le bail notarié me donne une sécurité que je n'avais jamais eue avec mes anciens contrats classiques.",
    location: "Toulouse 1er",
    highlight: "Accompagnement parfait",
  },
  {
    name: "Isabelle Moreau",
    role: "Gestionnaire de patrimoine",
    image:
      "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Pour mes clients investisseurs, je recommande systématiquement le bail notarié. La force exécutoire immédiate est un atout majeur.",
    location: "Nice 7ème",
    highlight: "Recommandé par les professionnels",
  },
  {
    name: "Jean-Luc Bernard",
    role: "Propriétaire multi-biens",
    image:
      "https://images.pexels.com/photos/2182973/pexels-photo-2182973.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Après 15 ans dans l'immobilier, je peux dire que le bail notarié est la meilleure protection. L'équipe BailNotarie est compétente et les délais sont respectés.",
    location: "Bordeaux 3ème",
    highlight: "15 ans d'expérience validée",
  },
];

const COLUMNS = [
  { items: [0, 3], duration: "46s" },
  { items: [1, 4], duration: "58s" },
  { items: [2, 5], duration: "52s" },
];

function TestimonialCard({ item }: { item: (typeof TESTIMONIALS)[number] }) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_46px_-30px_rgba(30,58,138,0.55)] transition-transform duration-500 hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Image
            src={item.image}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover"
            unoptimized
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
            <Award className="h-2 w-2 text-white" />
          </span>
        </div>
        <figcaption className="min-w-0">
          <div className="truncate text-[14.5px] font-semibold text-slate-900">{item.name}</div>
          <div className="truncate text-[12.5px] text-slate-500">{item.role}</div>
        </figcaption>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {[...Array(5)].map((_, index) => (
            <Star key={index} className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
          ))}
        </span>
      </div>

      <div className="relative mt-4">
        <Quote className="absolute -left-1 -top-1 h-6 w-6 text-[#4373f5]/15" />
        <blockquote className="relative pl-5 text-[14.5px] leading-relaxed text-slate-600">{item.text}</blockquote>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="rounded-full bg-[#4373f5]/[0.07] px-2.5 py-1 text-[12px] font-medium text-[#3563e9]">
          {item.highlight}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[12px] text-slate-400">
          <MapPin className="h-3 w-3" />
          {item.location}
        </span>
      </div>
    </figure>
  );
}

export function LpTestimonials() {
  return (
    <section
      id="temoignages"
      aria-labelledby="lp-testimonials-title"
      data-lp-chrome="#ffffff"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-white via-[#f7f9ff] to-white py-24 sm:py-32"
    >
      <div aria-hidden className="lp-mesh absolute inset-0 opacity-70" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel icon={Star}>Témoignages clients</SectionLabel>
          <h2
            id="lp-testimonials-title"
            className="lp-title lp-balance mt-6 text-4xl font-bold text-slate-900 sm:text-[3.25rem]"
          >
            Ils nous font confiance, <span className="lp-gradient-text">et vous ?</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Découvrez les retours d&apos;expérience des propriétaires qui ont choisi le bail notarié pour sécuriser leur
            location.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { value: "4,9/5", label: "note moyenne" },
              { value: "200+", label: "avis clients" },
              { value: "98%", label: "recommandent" },
              { value: "1 sem.", label: "délai moyen" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3.5 text-center backdrop-blur"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <div className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</div>
                  <div className="mt-0.5 text-[12.5px] text-slate-500">{stat.label}</div>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* Colonnes défilantes : trois vitesses différentes pour éviter l'effet bloc */}
        <div className="lp-fade-y lp-marquee-paused relative mt-12 h-[560px] overflow-hidden sm:h-[640px]">
          <div className="grid h-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COLUMNS.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className={cn("relative", columnIndex === 2 && "hidden lg:block")}
              >
                <div
                  className="lp-marquee-col flex flex-col gap-5"
                  style={{ ["--lp-duration" as string]: column.duration }}
                >
                  {[...Array(2)].map((_, copy) => (
                    <React.Fragment key={copy}>
                      {column.items.map((itemIndex) => (
                        <TestimonialCard key={`${copy}-${itemIndex}`} item={TESTIMONIALS[itemIndex]} />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
