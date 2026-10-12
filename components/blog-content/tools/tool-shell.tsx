"use client";

import { useId, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Cadre commun des outils interactifs du blog : en-tete, champs, resultat.
 * Les champs sont natifs (input, select) pour garder le clavier numerique
 * et le selecteur de date du telephone, avec une taille de police de 16 px
 * qui evite le zoom automatique d'iOS.
 */

export function ToolShell({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="not-prose -mx-2 my-10 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.12)] sm:mx-0"
    >
      <header className="border-b border-gray-100 bg-gray-50/60 px-4 py-5 sm:px-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</p>
        </div>
        <h2 id={`${id}-title`} className="mt-3 text-lg font-bold leading-snug text-gray-900 text-balance sm:text-xl">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{description}</p>
      </header>
      <div className="px-4 py-6 sm:px-7">{children}</div>
    </section>
  );
}

const fieldClass =
  'block w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20';

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  // min-w-0 : dans une grille, un enfant ne retrecit pas sous la largeur
  // naturelle de son champ sans cette regle.
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-800">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{hint}</p>}
    </div>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  suffix,
  min = 0,
  step = 'any',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  min?: number;
  step?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} tabular-nums ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-gray-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

/**
 * Safari iOS donne au champ date natif une largeur intrinseque qui ignore
 * `width: 100%` et deborde de la carte : on retire l'apparence native, on
 * autorise le retrecissement et on aligne la valeur a gauche comme les autres
 * champs.
 */
const dateFieldClass =
  'appearance-none [-webkit-appearance:none] min-w-0 max-w-full text-left [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]';

export function DateInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClass} ${dateFieldClass}`}
    />
  );
}

export function SelectInput({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} pr-9`}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Groupe de boutons a choix unique, plus rapide qu'une liste sur mobile. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 block text-sm font-medium text-gray-800">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/30 ${
                active
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Bloc de resultat : grand chiffre et details. */
export function ResultPanel({ tone = 'default', children }: { tone?: 'default' | 'blocked'; children: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className={`mt-6 rounded-2xl p-5 sm:p-6 ${tone === 'blocked' ? 'border border-amber-200 bg-amber-50' : 'bg-blue-50/70 ring-1 ring-blue-100'}`}
    >
      {children}
    </div>
  );
}

/* ---------- Utilitaires -------------------------------------------------- */

export function parseAmount(value: string): number {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function formatEuro(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

/** Date du jour au format AAAA-MM-JJ, dans le fuseau du visiteur. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Ajoute des mois en conservant le quantieme. Si le jour n'existe pas dans le
 * mois d'arrivee (31 janvier + 1 mois), on retient le dernier jour du mois.
 */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
