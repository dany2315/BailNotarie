"use client";

import * as React from "react";
import Link from "next/link";
import { HelpCircle, Phone, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Reveal, SectionLabel } from "./ui/lp-primitives";
import { cn } from "@/lib/utils";

/* Contenu identique à la FAQ de la page d'accueil : mêmes questions, mêmes
   réponses. Seule la présentation change. */
const CATEGORIES = [
  { id: "a-propos", label: "À propos de BailNotarie" },
  { id: "bail-notarie", label: "Le bail notarié" },
  { id: "couts", label: "Coûts et tarification" },
  { id: "securite", label: "Sécurité et garanties" },
  { id: "pratique", label: "Questions pratiques" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const FAQ: Record<CategoryId, { question: string; answer: string }[]> = {
  "a-propos": [
    {
      question: "Qui êtes-vous exactement ?",
      answer:
        "BailNotarie est une société spécialisée dans l'accompagnement et la facilitation des démarches de bail notarié. Nous ne sommes pas des notaires, mais nous travaillons en partenariat avec un réseau de plus de 150 notaires certifiés à travers la France. Notre rôle est de simplifier et d'accélérer le processus en préparant votre dossier et en coordonnant avec le notaire.",
    },
    {
      question: "Quelle est votre valeur ajoutée ?",
      answer:
        "Nous vous évitons les démarches complexes et chronophages. Au lieu de chercher un notaire, préparer seul votre dossier et gérer les allers-retours, nous nous occupons de tout : constitution du dossier, vérification des pièces, coordination avec le notaire, et suivi jusqu'à la signature. Nous transformons un processus qui peut prendre des semaines en quelques jours.",
    },
    {
      question: "Depuis quand existez-vous ?",
      answer:
        "BailNotarie accompagne les propriétaires depuis 2024. Nous avons déjà traité plus de 200 dossiers de baux notariés avec un taux de satisfaction de 98%. Notre expertise nous permet de connaître parfaitement les exigences de chaque notaire et d'optimiser les délais.",
    },
  ],
  "bail-notarie": [
    {
      question: "Qu'est-ce qu'un bail notarié et en quoi diffère-t-il d'un bail classique ?",
      answer:
        "Un bail notarié est un contrat de location authentifié par un notaire. Contrairement au bail sous seing privé classique, il devient un acte authentique doté d'une force exécutoire immédiate. Cela signifie qu'en cas d'impayés, vous pouvez directement procéder à une saisie sans passer par un tribunal, réduisant le délai à 2-3 mois contre 12-18 mois pour un bail classique. En plus de cette rapidité, il offre une sécurité juridique maximale car il est validé par un professionnel du droit.",
    },
    {
      question: "Le bail notarié est-il légal ?",
      answer:
        "Absolument ! Le bail notarié est parfaitement légal et reconnu par la loi française. L'article 1369 du Code civil précise que l'acte authentique fait foi de la convention qu'il renferme. C'est même la forme la plus sécurisée juridiquement pour un contrat de location.",
    },
    {
      question: "Tous les types de location peuvent-ils être notariés ?",
      answer:
        "Oui, tous les types de baux peuvent être notariés : bail d'habitation, bail commercial, bail rural, colocation, location meublée ou vide. Le bail notarié s'adapte à toutes les situations locatives et respecte toutes les réglementations spécifiques (loi Alur, etc.).",
    },
    {
      question: "Faut-il une procuration pour signer un bail notarié à distance ?",
      answer:
        "Oui. Lorsque la signature du bail notarié se fait entièrement à distance, une procuration authentique est nécessaire afin de permettre au notaire de signer l'acte au nom de la partie concernée. Cette procuration est établie et sécurisée par le notaire, généralement par visioconférence. Un coût supplémentaire d'environ une quarantaine d'euros peut s'appliquer pour cette formalité, conformément au tarif réglementé des notaires.",
    },
  ],
  couts: [
    {
      question: "Combien coûte un bail notarié avec BailNotarie ?",
      answer:
        "Deux types de frais s'appliquent : (1) Les frais de dossier BailNotarie : 39,90€ TTC forfaitaires, pour la constitution, la vérification documentaire et la transmission de votre dossier à l'étude notariale. Ces frais sont remboursés intégralement si le dossier n'aboutit pas pour une raison indépendante de votre volonté. (2) Les frais notariés : fixés par l'État, ils correspondent à environ la moitié d'un loyer mensuel hors charges, et sont facturés directement par le notaire. Ces frais sont indépendants de BailNotarie.",
    },
    {
      question: "Y a-t-il des frais cachés ?",
      answer:
        "Non. Notre tarification est totalement transparente : 39,90€ TTC de frais de dossier pour la constitution, vérification et transmission du dossier par la plateforme BailNotarie. À cela s'ajoutent les frais notariés réglementés par l'État (environ 50% du loyer mensuel hors charges), directement facturés par l'étude notariale. Aucune surprise.",
    },
    {
      question: "Le coût est-il déductible fiscalement ?",
      answer:
        "Pour les propriétaires bailleurs, les frais de bail notarié peuvent être déductibles des revenus fonciers en tant que frais de gestion. Nous vous conseillons de consulter votre comptable ou conseiller fiscal pour votre situation spécifique.",
    },
  ],
  securite: [
    {
      question: "Que se passe-t-il en cas de litige avec le locataire ?",
      answer:
        "Le bail notarié vous donne un avantage considérable : la force exécutoire immédiate. En cas d'impayés, vous pouvez directement faire appel à un huissier pour une saisie, sans passer par le tribunal. Cela réduit considérablement les délais et les coûts de recouvrement.",
    },
    {
      question: "Le bail notarié protège-t-il mieux qu'une assurance loyers impayés ?",
      answer:
        "Le bail notarié et l'assurance loyers impayés sont complémentaires. Le bail notarié vous permet d'agir plus rapidement en cas de problème, tandis que l'assurance vous indemnise.",
    },
  ],
  pratique: [
    {
      question: "Quels documents dois-je fournir ?",
      answer:
        "Pour le propriétaire : titre de propriété, diagnostics obligatoires, pièce d'identité, assurance. Pour le locataire : pièce d'identité, assurance habitation. Pour le garant (si applicable) : pièce d'identité. Nous vous fournissons une liste détaillée selon votre situation.",
    },
    {
      question: "Puis-je modifier le bail après signature ?",
      answer:
        "Comme tout acte notarié, les modifications nécessitent un avenant notarié. Cependant, nous préparons soigneusement le bail initial pour éviter les modifications ultérieures. Nous incluons toutes les clauses nécessaires dès la première version.",
    },
    {
      question: "Le bail notarié est-il valable dans toute la France ?",
      answer:
        "Oui, le bail notarié a une valeur juridique dans toute la France. Notre réseau de notaires partenaires couvre l'ensemble du territoire, nous pouvons donc traiter votre dossier quelle que soit la localisation du bien.",
    },
    {
      question: "Que faire si le locataire refuse de signer chez le notaire ?",
      answer:
        "Si le locataire refuse la signature notariée, vous pouvez maintenir cette exigence (c'est votre droit) ou accepter un bail classique. Beaucoup de locataires acceptent finalement car cela témoigne du sérieux de la location. Nous pouvons vous aider à expliquer les avantages au locataire.",
    },
  ],
};

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = React.useState(false);
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors duration-300",
        open ? "border-[#4373f5]/30 bg-white shadow-[0_20px_50px_-32px_rgba(30,58,138,0.6)]" : "border-slate-200 bg-white/70",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span className="text-[15.5px] font-semibold leading-snug text-slate-900">{question}</span>
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300",
            open ? "rotate-45 bg-[#4373f5] text-white" : "bg-slate-100 text-slate-500",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-[14.5px] leading-relaxed text-slate-600 sm:px-6 sm:pb-6">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LpFaq() {
  const [category, setCategory] = React.useState<CategoryId>("a-propos");

  return (
    <section
      id="faq"
      aria-labelledby="lp-faq-title"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-white to-[#f7f9ff] py-24 sm:py-32"
    >
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal className="text-center">
          <SectionLabel icon={HelpCircle}>Questions fréquentes</SectionLabel>
          <h2 id="lp-faq-title" className="lp-title lp-balance mt-6 text-4xl font-bold text-slate-900 sm:text-[3.25rem]">
            Tout savoir sur le <span className="lp-gradient-text">bail notarié</span>
          </h2>
        </Reveal>

        {/* Filtres de catégories */}
        <Reveal delay={0.06}>
          <div className="lp-scrollbar-none mt-10 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
            {CATEGORIES.map((item) => {
              const selected = item.id === category;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  aria-pressed={selected}
                  className={cn(
                    "relative shrink-0 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors duration-300",
                    selected ? "text-white" : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="lp-faq-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] shadow-[0_10px_26px_-14px_rgba(53,99,233,1)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-8 space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              {FAQ[category].map((item) => (
                <FaqItem key={item.question} {...item} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bloc contact */}
        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_24px_60px_-40px_rgba(30,58,138,0.6)] sm:flex-row sm:text-left">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Vous ne trouvez pas votre réponse ?</h3>
              <p className="mt-1 text-[14.5px] text-slate-600">
                Notre équipe vous accompagne dans la constitution de votre dossier.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <a
                href="tel:0749387756"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14.5px] font-semibold text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9]"
              >
                <Phone className="h-4 w-4 text-[#4373f5]" />
                07 49 38 77 56
              </a>
              <Link
                href="#contact"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-5 py-3 text-[14.5px] font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                Nous écrire
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
