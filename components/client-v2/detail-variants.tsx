"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DetailModel, DetailSection } from "./detail-model";
import { IconTile, MicroLabel, Pill, Surface } from "./owner-ui";

/* =========================================================================
   Quatre mises en page pour une sous-page de détail.

   Le problème commun : faire comprendre d'un coup d'œil qu'on n'est plus sur
   une page principale de l'espace client, mais un cran plus bas. Chaque
   option s'y prend autrement — bandeau teinté, feuille posée, colonne de
   résumé, ou dépouillement éditorial.
   ========================================================================= */

export type VariantKey = "bandeau" | "feuille" | "rail" | "editorial";

export const VARIANTS: Array<{ key: VariantKey; name: string; idea: string }> = [
  { key: "bandeau", name: "Bandeau", idea: "Un en-tête teinté profond : on a clairement changé de niveau." },
  { key: "feuille", name: "Feuille", idea: "Une feuille blanche posée sur l'espace, qu'on voit dépasser derrière." },
  { key: "rail", name: "Rail", idea: "Une colonne de résumé qui suit le défilement, le détail à côté." },
  { key: "editorial", name: "Éditorial", idea: "Une colonne étroite, des filets plutôt que des cartes." },
];

/* ---------- Pièces communes -------------------------------------------------- */

function Trail({
  model,
  tone = "clair",
}: {
  model: DetailModel;
  tone?: "clair" | "sombre";
}) {
  const dim = tone === "sombre";
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[11.5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {model.trail.map((step, index) => {
        const last = index === model.trail.length - 1;
        return (
          <li key={index} className="flex shrink-0 items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className={cn("h-3 w-3", dim ? "text-white/30" : "text-slate-300")} />
            )}
            {step.href && !last ? (
              <Link
                href={step.href}
                className={cn(
                  "font-medium transition-colors",
                  dim ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-700",
                )}
              >
                {step.label}
              </Link>
            ) : (
              <span
                aria-current={last ? "page" : undefined}
                className={cn("font-semibold", dim ? "text-white" : "text-slate-700")}
              >
                {step.label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function BackArrow({ href, tone = "clair" }: { href: string; tone?: "clair" | "sombre" }) {
  const dim = tone === "sombre";
  const router = useRouter();

  // Revenir en arrière, pas choisir une destination : c'est le fil d'Ariane qui
  // nomme les étapes. `href` ne sert que de repli, sans historique.
  const goBack = () => {
    // Deux repères, parce qu'aucun n'est fiable seul : Next numérote ses
    // propres entrées dans `history.state.idx` quand il le fournit ; sinon on
    // se rabat sur la longueur de l'historique, qui vaut 1 dans un onglet
    // ouvert directement. Sans rien derrière nous, la flèche rejoint le parent
    // plutôt que de faire sortir du site.
    if (typeof window !== "undefined") {
      const state = window.history.state as { idx?: number } | null;
      const enArriere =
        typeof state?.idx === "number" ? state.idx > 0 : window.history.length > 1;
      if (enArriere) {
        router.back();
        return;
      }
    }
    router.push(href);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      title="Retour"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
        dim
          ? "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          : "bg-white text-slate-500 ring-1 ring-slate-200/80 hover:text-slate-900",
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Retour</span>
    </button>
  );
}

function Fields({ section }: { section: DetailSection }) {
  const fields = (section.fields ?? []).filter((field) => field.value);
  if (fields.length === 0) return null;
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className={cn(field.wide && "sm:col-span-2")}>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {field.label}
          </dt>
          <dd className="mt-1 text-[14px] font-medium leading-snug text-slate-800">
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Les champs en lignes séparées d'un filet — l'écriture de l'option éditoriale. */
function FieldRows({ section }: { section: DetailSection }) {
  const fields = (section.fields ?? []).filter((field) => field.value);
  if (fields.length === 0) return null;
  return (
    <dl className="divide-y divide-slate-100">
      {fields.map((field) => (
        <div
          key={field.label}
          className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-6"
        >
          <dt className="shrink-0 text-[12px] text-slate-400 sm:w-44">{field.label}</dt>
          <dd className="text-[14px] font-medium text-slate-800">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- 1. Bandeau -------------------------------------------------------- */

function Bandeau({ model, chrome }: { model: DetailModel; chrome: boolean }) {
  return (
    <div className="min-h-full bg-background">
      {/* Le bandeau : la page principale n'en a jamais, donc sa seule présence
          dit qu'on est descendu d'un cran. */}
      {/* La barre du site flotte au-dessus du contenu : sur mobile, chaque mise
          en page lui réserve sa hauteur, comme le fait OwnerCanvas ailleurs. */}
      <header
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-[#1b2f6b] via-[#25428f] to-[#3563e9] pb-16 sm:pt-8",
          chrome ? "pt-[calc(var(--lp-nav-h,76px)+0.5rem)]" : "pt-6",
        )}
      >
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6">
          {chrome && (
            <div className="mb-6 flex items-center gap-3">
              <BackArrow href={model.backHref} tone="sombre" />
              <Trail model={model} tone="sombre" />
            </div>
          )}

          <p className=" text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
            {model.eyebrow}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="lp-title text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
              {model.title}
            </h1>
            {model.status && (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur">
                {model.status.label}
              </span>
            )}
          </div>
          {model.subtitle && (
            <p className="mt-1.5 text-[13px] text-white/60">{model.subtitle}</p>
          )}
          {model.actions && <div className="mt-5 flex flex-wrap gap-2">{model.actions}</div>}
        </div>
      </header>

      {/* Les chiffres chevauchent le bandeau : la couture entre les deux plans. */}
      {/* `relative z-10` : sans cela, le bandeau — positionné — recouvre la
          carte de chiffres qui doit le chevaucher. */}
      <div className="relative z-10 mx-auto -mt-10 w-full max-w-4xl px-4 sm:px-6">
        {model.stats.length > 0 && (
          <Surface tone="raised" className="grid grid-cols-2 divide-x divide-slate-100 overflow-hidden sm:grid-cols-4">
            {model.stats.map((stat) => (
              <div key={stat.label} className="px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-[16px] font-bold tabular-nums tracking-tight text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </Surface>
        )}

        <div className="mt-4 space-y-4 pb-16">
          {model.status?.note && (
            <p className="px-1 text-[13px] leading-snug text-slate-500">{model.status.note}</p>
          )}
          {model.sections.map((section) => (
            <Surface key={section.id} tone="raised" className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <IconTile icon={section.icon} tone="blue" size="sm" />
                <MicroLabel>{section.title}</MicroLabel>
              </div>
              <Fields section={section} />
              {section.node}
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 2. Feuille -------------------------------------------------------- */

function Feuille({ model, chrome }: { model: DetailModel; chrome: boolean }) {
  return (
    /* Le fond est celui de l'espace client, pas une teinte à part : le dégradé
       de dissolution de la barre du haut tombe ainsi sur la même couleur, et la
       couture disparaît. */
    <div
      className={cn(
        "min-h-full bg-background px-0 pb-0 sm:px-6 sm:pb-6 sm:pt-5",
        chrome ? "pt-[calc(var(--lp-nav-h,76px)+0.5rem)]" : "pt-0",
      )}
    >
      {/* Une feuille posée sur l'espace client : on voit le canevas dépasser
          autour, comme une fiche sortie d'un dossier. */}
      <div className="mx-auto min-h-[calc(100dvh-var(--lp-nav-h,76px)-1rem)] w-full max-w-3xl overflow-hidden rounded-t-[28px] bg-white shadow-[0_-2px_0_rgba(255,255,255,0.8),0_30px_70px_-40px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/70 sm:min-h-0 sm:rounded-[28px]">
        {chrome && (
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
            <BackArrow href={model.backHref} />
            <Trail model={model} />
          </div>
        )}

        <div className="px-4 pb-14 pt-6 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3563e9]">
            {model.eyebrow}
          </p>
          <div className="mt-2 flex items-start gap-3.5">
            <IconTile icon={model.icon} tone="blue" size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="lp-title text-[24px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
                {model.title}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {model.status && <Pill tone={model.status.tone}>{model.status.label}</Pill>}
                {model.subtitle && (
                  <span className="truncate text-[12.5px] text-slate-500">{model.subtitle}</span>
                )}
              </div>
            </div>
          </div>
          {model.status?.note && (
            <p className="mt-3 text-[13px] leading-snug text-slate-500">{model.status.note}</p>
          )}
          {model.actions && <div className="mt-5 flex flex-wrap gap-2">{model.actions}</div>}

          {model.stats.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-100 sm:grid-cols-4">
              {model.stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={cn(
                    "bg-slate-50/70 px-3.5 py-3",
                    // Le dernier d'un nombre impair prend toute la largeur :
                    // pas de case vide au bout de la rangée.
                    index === model.stats.length - 1 &&
                      model.stats.length % 2 === 1 &&
                      "col-span-2 sm:col-span-1",
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold tabular-nums tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-8">
            {model.sections.map((section) => (
              <section key={section.id}>
                <div className="mb-3.5 flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                  <section.icon className="h-4 w-4 text-[#3563e9]" />
                  <MicroLabel>{section.title}</MicroLabel>
                </div>
                <Fields section={section} />
                {section.node}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Rail ----------------------------------------------------------- */

function Rail({ model, chrome }: { model: DetailModel; chrome: boolean }) {
  return (
    <div className="min-h-full bg-background">
      <div
        className={cn(
          "mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pt-5",
          chrome ? "pt-[calc(var(--lp-nav-h,76px)+0.5rem)]" : "pt-0 sm:pt-0",
        )}
      >
        {chrome && (
          <div className="flex items-center gap-3">
            <BackArrow href={model.backHref} />
            <Trail model={model} />
          </div>
        )}

        <div className={cn("gap-6 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start", chrome && "mt-5")}>
          {/* Le résumé reste sous les yeux pendant qu'on lit le détail. */}
          <aside className="lg:sticky lg:top-5">
            <Surface tone="raised" className="p-5">
              <IconTile icon={model.icon} tone="blue" size="lg" />
              <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {model.eyebrow}
              </p>
              <h1 className="lp-title mt-1 text-[21px] font-bold leading-tight tracking-tight text-slate-900">
                {model.title}
              </h1>
              {model.subtitle && (
                <p className="mt-1.5 text-[12.5px] leading-snug text-slate-500">{model.subtitle}</p>
              )}
              {model.status && (
                <div className="mt-3">
                  <Pill tone={model.status.tone}>{model.status.label}</Pill>
                </div>
              )}
              {model.status?.note && (
                <p className="mt-3 text-[12.5px] leading-snug text-slate-500">{model.status.note}</p>
              )}

              {model.stats.length > 0 && (
                <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                  {model.stats.map((stat) => (
                    <div key={stat.label} className="flex items-baseline justify-between gap-3 py-2">
                      <dt className="text-[12px] text-slate-400">{stat.label}</dt>
                      <dd className="text-[13.5px] font-bold tabular-nums text-slate-900">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {model.actions && (
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
                  {model.actions}
                </div>
              )}
            </Surface>
          </aside>

          <div className="mt-4 space-y-4 lg:mt-0">
            {model.sections.map((section) => (
              <Surface key={section.id} tone="raised" className="p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <IconTile icon={section.icon} tone="blue" size="sm" />
                  <MicroLabel>{section.title}</MicroLabel>
                </div>
                <Fields section={section} />
                {section.node}
              </Surface>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 4. Éditorial ------------------------------------------------------ */

function Editorial({ model, chrome }: { model: DetailModel; chrome: boolean }) {
  return (
    <div className="min-h-full bg-white">
      {/* Une barre fine qui reste : le seul élément de chrome, et le repère
          permanent qu'on est dans une fiche. */}
      {chrome && (
        <div className="sticky top-[calc(var(--lp-nav-h,76px)+0.5rem)] z-10 border-b border-slate-100 bg-white/85 backdrop-blur-xl sm:top-0">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <BackArrow href={model.backHref} />
            <Trail model={model} />
          </div>
        </div>
      )}

      <div
        className={cn(
          "mx-auto w-full max-w-2xl px-4 pb-20 sm:px-6 sm:pt-10",
          chrome ? "pt-[calc(var(--lp-nav-h,76px)+1.5rem)]" : "pt-6",
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3563e9]">
          {model.eyebrow}
        </p>
        <h1 className="lp-title mt-2 text-[30px] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-[38px]">
          {model.title}
        </h1>
        {model.subtitle && (
          <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{model.subtitle}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {model.status && <Pill tone={model.status.tone}>{model.status.label}</Pill>}
        </div>
        {model.status?.note && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-500">{model.status.note}</p>
        )}
        {model.actions && <div className="mt-6 flex flex-wrap gap-2">{model.actions}</div>}

        {model.stats.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y border-slate-100 py-5">
            {model.stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-[19px] font-bold tabular-nums tracking-tight text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 space-y-10">
          {model.sections.map((section) => (
            <section key={section.id}>
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {section.title}
              </h2>
              <FieldRows section={section} />
              {section.node}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Le sélecteur ------------------------------------------------------ */

export function DetailVariant({
  variant,
  model,
  /** Faux quand la barre du haut porte déjà la flèche et le fil d'Ariane. */
  chrome = true,
}: {
  variant: VariantKey;
  model: DetailModel;
  chrome?: boolean;
}) {
  if (variant === "bandeau") return <Bandeau model={model} chrome={chrome} />;
  if (variant === "feuille") return <Feuille model={model} chrome={chrome} />;
  if (variant === "rail") return <Rail model={model} chrome={chrome} />;
  return <Editorial model={model} chrome={chrome} />;
}
