"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { fr } from "react-day-picker/locale"

import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/* =========================================================================
   Champ date unique de l'application.

   • Saisie au clavier au format JJ/MM/AAAA : les barres s'insèrent toutes
     seules, on ne tape que des chiffres. Un collage « 15/03/1990 »,
     « 15.03.1990 » ou « 1990-03-15 » est accepté.
   • Un bouton ouvre le calendrier pour choisir la date à la souris ou au doigt.
   • La date n'est transmise au formulaire que lorsqu'elle est complète et
     réelle (pas de 31/02, pas d'année hors bornes). Tant qu'elle ne l'est
     pas, le formulaire reçoit `undefined` — jamais une date à moitié lue.

   Toutes les dates circulent en « jour calendaire » : minuit UTC pour la
   variante `Date`, « yyyy-MM-dd » pour la variante chaîne. Aucun fuseau
   horaire ne peut donc décaler le jour choisi.
   ========================================================================= */

type DateParts = { year: number; month: number; day: number } // month : 1-12

const pad = (n: number, size = 2) => String(n).padStart(size, "0")

function isRealDate({ year, month, day }: DateParts): boolean {
  if (month < 1 || month > 12 || day < 1) return false
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return day <= lastDay
}

/**
 * Lit les composantes d'une valeur venue du formulaire ou de la base.
 * Une `Date` à minuit UTC (base de données, ancienne version de ce champ) se
 * lit en UTC ; toute autre `Date` (créée localement) se lit en heure locale.
 */
function partsFromValue(value: Date | string | null | undefined): DateParts | null {
  if (!value) return null

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    const isUtcMidnight =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0
    return isUtcMidnight
      ? { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() }
      : { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() }
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const parts = { year: +iso[1], month: +iso[2], day: +iso[3] }
    return isRealDate(parts) ? parts : null
  }

  const frDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (frDate) {
    const parts = { year: +frDate[3], month: +frDate[2], day: +frDate[1] }
    return isRealDate(parts) ? parts : null
  }

  return null
}

const partsKey = (parts: DateParts | null) =>
  parts ? `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}` : ""

const formatParts = (parts: DateParts | null) =>
  parts ? `${pad(parts.day)}/${pad(parts.month)}/${pad(parts.year, 4)}` : ""

const toUtcDate = (parts: DateParts) => new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
const toLocalDate = (parts: DateParts) => new Date(parts.year, parts.month - 1, parts.day)

/**
 * Remet en forme la saisie : chiffres seulement, barres ajoutées en avançant,
 * jamais réinsérées pendant un effacement (sinon impossible d'effacer la
 * barre). Un chiffre isolé suivi d'un séparateur est complété d'un zéro :
 * « 3/ » devient « 03/ ».
 */
function maskInput(raw: string, previous: string): string {
  const pasted = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (pasted) return `${pasted[3]}/${pasted[2]}/${pasted[1]}`

  const deleting = raw.length < previous.length
  let normalized = raw.replace(/[.\-\s]/g, "/").replace(/[^\d/]/g, "")
  if (!deleting) {
    // « 3/ » → « 03/ » : un jour ou un mois d'un seul chiffre fermé par une barre.
    normalized = normalized.replace(/(^|\/)(\d)(?=\/)/g, (_m, sep: string, digit: string) => `${sep}0${digit}`)
  }
  const digits = normalized.replace(/\D/g, "").slice(0, 8)
  // En effaçant, une barre déjà présente reste en place ; en avançant, elle
  // s'ajoute dès que le jour (2 chiffres) ou le mois (4 chiffres) est complet.
  const keepSlash = (count: number) =>
    digits.length > count || (digits.length === count && (!deleting || normalized.endsWith("/")))

  let out = digits.slice(0, 2)
  if (keepSlash(2)) out += "/"
  out += digits.slice(2, 4)
  if (keepSlash(4)) out += "/"
  out += digits.slice(4, 8)
  return out
}

type ParseResult = { parts: DateParts } | { error: string } | null

function parseTyped(text: string, minYear: number, maxYear: number): ParseResult {
  if (!text) return null
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return { error: "Date incomplète — format JJ/MM/AAAA" }
  const parts = { year: +match[3], month: +match[2], day: +match[1] }
  if (!isRealDate(parts)) return { error: "Cette date n'existe pas" }
  if (parts.year < minYear || parts.year > maxYear) {
    return { error: `L'année doit être comprise entre ${minYear} et ${maxYear}` }
  }
  return { parts }
}

/** Formate une date en JJ/MM/AAAA, sans décalage de fuseau. */
export function formatDateToLocalString(date: Date | string): string {
  return formatParts(partsFromValue(date))
}

/* ---------- Noyau partagé ------------------------------------------------ */

interface DateFieldCoreProps {
  id?: string
  name?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Bornes de saisie et du calendrier (années incluses). */
  fromYear?: number
  toYear?: number
  autoComplete?: string
  onBlur?: () => void
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

interface DateFieldCoreInternalProps extends DateFieldCoreProps {
  parts: DateParts | null
  onPartsChange: (parts: DateParts | null) => void
}

function DateFieldCore({
  parts,
  onPartsChange,
  id: idProp,
  name,
  label,
  placeholder = "JJ/MM/AAAA",
  disabled = false,
  className,
  fromYear,
  toYear,
  autoComplete = "off",
  onBlur,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DateFieldCoreInternalProps) {
  const generatedId = React.useId()
  const id = idProp ?? `date-${generatedId}`
  const errorId = `${id}-error`
  const currentYear = new Date().getFullYear()
  const minYear = fromYear ?? currentYear - 120
  const maxYear = toYear ?? currentYear + 30

  const valueKey = partsKey(parts)
  const [text, setText] = React.useState(() => formatParts(parts))
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date>(() => (parts ? toLocalDate(parts) : new Date()))

  // Dernière valeur transmise par ce champ : une valeur entrante identique
  // vient de nous, et ne doit pas écraser ce que l'utilisateur est en train
  // de taper.
  const emittedKeyRef = React.useRef(valueKey)

  React.useEffect(() => {
    if (valueKey === emittedKeyRef.current) return
    emittedKeyRef.current = valueKey
    setText(formatParts(parts))
    setError(null)
    if (parts) setMonth(toLocalDate(parts))
    // `parts` est entièrement décrit par `valueKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey])

  const emit = (next: DateParts | null) => {
    const key = partsKey(next)
    if (key === emittedKeyRef.current) return
    emittedKeyRef.current = key
    onPartsChange(next)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = maskInput(event.target.value, text)
    setText(next)
    const result = parseTyped(next, minYear, maxYear)
    if (result && "parts" in result) {
      setError(null)
      setMonth(toLocalDate(result.parts))
      emit(result.parts)
    } else {
      // Pendant la frappe on ne signale rien : l'erreur attend la sortie du
      // champ, ou une saisie complète mais fausse.
      setError(result && next.length === 10 ? result.error : null)
      emit(null)
    }
  }

  const handleBlur = () => {
    const result = parseTyped(text, minYear, maxYear)
    setError(result && "error" in result ? result.error : null)
    onBlur?.()
  }

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    const next = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
    setText(formatParts(next))
    setError(null)
    setMonth(date)
    emit(next)
    setOpen(false)
    onBlur?.()
  }

  const invalid = Boolean(error) || Boolean(ariaInvalid)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={10}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={cn(error && errorId, ariaDescribedBy) || undefined}
          className={cn("bg-background pr-11 tabular-nums", className)}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && event.altKey) {
              event.preventDefault()
              setOpen(true)
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Ouvrir le calendrier"
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <CalendarIcon className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="end" sideOffset={8}>
            <Calendar
              mode="single"
              selected={parts ? toLocalDate(parts) : undefined}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleSelect}
              captionLayout="dropdown"
              startMonth={new Date(minYear, 0, 1)}
              endMonth={new Date(maxYear, 11, 31)}
              locale={fr}
              formatters={{
                formatMonthDropdown: (date) => date.toLocaleString("fr-FR", { month: "short" }),
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && (
        <p id={errorId} className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/* ---------- Variante Date (minuit UTC) ----------------------------------- */

export interface DatePickerProps extends DateFieldCoreProps {
  value?: Date | string | null
  onChange?: (date: Date | undefined) => void
}

/** Champ date dont la valeur est une `Date` à minuit UTC. */
export function DatePicker({ value, onChange, ...rest }: DatePickerProps) {
  const parts = partsFromValue(value)
  return (
    <DateFieldCore
      {...rest}
      parts={parts}
      onPartsChange={(next) => onChange?.(next ? toUtcDate(next) : undefined)}
    />
  )
}

/* ---------- Variante chaîne (« yyyy-MM-dd ») ----------------------------- */

export interface DateInputProps extends DateFieldCoreProps {
  value?: string | Date | null
  onChange?: (value: string) => void
}

/**
 * Champ date dont la valeur est une chaîne « yyyy-MM-dd » (ou "" si vide) —
 * le même contrat qu'un `<input type="date">`, qu'il remplace.
 */
export function DateInput({ value, onChange, ...rest }: DateInputProps) {
  const parts = partsFromValue(value)
  return (
    <DateFieldCore
      {...rest}
      parts={parts}
      onPartsChange={(next) => onChange?.(partsKey(next))}
    />
  )
}
