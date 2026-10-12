import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Info, Lightbulb, XCircle } from 'lucide-react';

/**
 * Briques editoriales des guides pratiques du blog (preavis, etat des lieux,
 * revision du loyer, depot de garantie). Elles sont rendues dans le conteneur
 * `.prose` de l'article : chaque bloc compose son propre rythme et neutralise
 * les styles de liste herites quand il en a besoin.
 */

/* ---------- Titres de section ------------------------------------------ */

export function SectionHeading({ id, step, children }: { id: string; step?: string; children: ReactNode }) {
  // L'etiquette reste hors du h2 : le titre lu par les moteurs ne contient
  // que la formulation de la requete visee.
  return (
    <div className="not-prose mt-14 mb-5">
      {step && (
        <p aria-hidden="true" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          {step}
        </p>
      )}
      <h2 id={id} className="text-2xl md:text-[1.7rem] font-bold leading-tight tracking-tight text-gray-900 text-balance">
        {children}
      </h2>
    </div>
  );
}

/* ---------- Chiffres cles ---------------------------------------------- */

export interface KeyFact {
  value: string;
  label: string;
  hint?: string;
}

export function KeyFacts({ items }: { items: KeyFact[] }) {
  return (
    <div className="not-prose my-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
          <p className="text-[1.75rem] font-bold leading-none tracking-tight text-gray-900 tabular-nums">{item.value}</p>
          <p className="mt-2 text-sm font-medium text-gray-800">{item.label}</p>
          {item.hint && <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Encadres ---------------------------------------------------- */

const calloutTones = {
  info: { wrap: 'border-blue-200 bg-blue-50/60', icon: Info, iconClass: 'text-blue-600' },
  tip: { wrap: 'border-emerald-200 bg-emerald-50/60', icon: Lightbulb, iconClass: 'text-emerald-600' },
  warning: { wrap: 'border-amber-200 bg-amber-50/70', icon: AlertTriangle, iconClass: 'text-amber-600' },
} as const;

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: keyof typeof calloutTones;
  title?: string;
  children: ReactNode;
}) {
  const { wrap, icon: Icon, iconClass } = calloutTones[tone];
  return (
    <aside className={`not-prose my-6 flex gap-3 rounded-2xl border p-4 sm:p-5 ${wrap}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden="true" />
      <div className="min-w-0 text-[0.95rem] leading-relaxed text-gray-800">
        {title && <p className="mb-1 font-semibold text-gray-900">{title}</p>}
        <div className="space-y-2">{children}</div>
      </div>
    </aside>
  );
}

/* ---------- Listes ------------------------------------------------------ */

export function CheckList({ items, variant = 'check' }: { items: ReactNode[]; variant?: 'check' | 'cross' }) {
  const Icon = variant === 'check' ? CheckCircle2 : XCircle;
  const iconClass = variant === 'check' ? 'text-blue-600' : 'text-rose-500';
  return (
    <ul className="not-prose my-5 space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-[0.98rem] leading-relaxed text-gray-700">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export interface Step {
  title: string;
  body: ReactNode;
}

/** Etapes numerotees reliees par un filet vertical. */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="not-prose my-8 space-y-0">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
          {index < steps.length - 1 && (
            <span className="absolute left-[15px] top-9 bottom-1 w-px bg-gray-200" aria-hidden="true" />
          )}
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0 pt-1">
            <p className="font-semibold text-gray-900">{step.title}</p>
            <div className="mt-1 text-[0.95rem] leading-relaxed text-gray-600">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Comparatif deux colonnes ----------------------------------- */

export function CompareCards({
  left,
  right,
}: {
  left: { title: string; tag?: string; items: ReactNode[] };
  right: { title: string; tag?: string; items: ReactNode[] };
}) {
  const card = (data: typeof left, accent: boolean) => (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'}`}>
      {data.tag && (
        <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.12em] ${accent ? 'text-blue-700' : 'text-gray-500'}`}>
          {data.tag}
        </p>
      )}
      <p className="text-lg font-semibold text-gray-900">{data.title}</p>
      <ul className="mt-3 space-y-2">
        {data.items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accent ? 'bg-blue-600' : 'bg-gray-400'}`} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="not-prose my-8 grid gap-4 md:grid-cols-2">
      {card(left, false)}
      {card(right, true)}
    </div>
  );
}

/* ---------- Tableau ----------------------------------------------------- */

export function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="not-prose my-8 overflow-x-auto rounded-2xl border border-gray-200">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-gray-50">
            {head.map((cell) => (
              <th key={cell} scope="col" className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-900">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100 last:border-0">
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row" className="px-4 py-3 align-top font-medium text-gray-900">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Conversion -------------------------------------------------- */

export function InlineCta({
  eyebrow,
  title,
  body,
  primary,
  secondary,
  points,
}: {
  eyebrow: string;
  title: string;
  body: ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  points?: string[];
}) {
  return (
    <section className="not-prose my-12 overflow-hidden rounded-3xl bg-gray-950 text-white">
      <div className="relative p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl"
          aria-hidden="true"
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">{eyebrow}</p>
        <p className="relative mt-3 text-2xl font-bold leading-tight tracking-tight text-balance sm:text-[1.7rem]">{title}</p>
        <div className="relative mt-3 max-w-xl text-[0.95rem] leading-relaxed text-gray-300">{body}</div>
        {points && points.length > 0 && (
          <ul className="relative mt-5 grid gap-2 sm:grid-cols-2">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-gray-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        )}
        <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={primary.href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-blue-50"
          >
            {primary.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Lien de maillage interne mis en avant au fil du texte. */
export function ReadAlso({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="not-prose group my-6 flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 no-underline transition-colors hover:border-blue-200 hover:bg-blue-50/40"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">À lire aussi</span>
        <span className="mt-1 block font-semibold text-gray-900 group-hover:text-blue-700">{label}</span>
        <span className="mt-0.5 block text-sm text-gray-600">{hint}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" />
    </Link>
  );
}

/* ---------- Sources ----------------------------------------------------- */

export function Sources({ items }: { items: { label: string; href: string }[] }) {
  return (
    <section aria-labelledby="sources" className="not-prose mt-14 rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
      <h2 id="sources" className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-500">
        Sources officielles
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-2 text-sm text-gray-700 underline-offset-4 hover:text-blue-700 hover:underline"
            >
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Article d&apos;information générale, à jour à sa date de publication. Il ne remplace pas un conseil adapté à
        votre situation : une ADIL peut vous renseigner gratuitement.
      </p>
    </section>
  );
}
