"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format, parse } from "date-fns"
import { fr } from "date-fns/locale"

/**
 * Normalise une date en heure locale française (sans décalage de fuseau horaire)
 */
function normalizeToLocalDate(date: Date | string | undefined): Date | undefined {
  if (!date) return undefined

  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  if (typeof date === "string") {
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10)
      const month = parseInt(dateMatch[2], 10) - 1
      const day = parseInt(dateMatch[3], 10)
      const normalizedDate = new Date(year, month, day)
      return isNaN(normalizedDate.getTime()) ? undefined : normalizedDate
    }

    const isoDate = new Date(date)
    if (!isNaN(isoDate.getTime())) {
      return new Date(isoDate.getFullYear(), isoDate.getMonth(), isoDate.getDate())
    }
  }

  return undefined
}

export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Formate une date pour l'affichage dans l'input (format français long)
 */
function formatDateForInput(date: Date | undefined): string {
  if (!date) return ""
  return format(date, "PPP", { locale: fr })
}

/**
 * Parse une string de date en Date, en essayant plusieurs formats
 * ⚠️ Version STRICTE : on ne parse que si la chaîne matche un format complet
 */
function parseDateString(dateString: string): Date | undefined {
  const value = dateString.trim()
  if (!value) return undefined

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = parse(value, "yyyy-MM-dd", new Date(), { locale: fr })
    return isNaN(parsed.getTime())
      ? undefined
      : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  // dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const parsed = parse(value, "dd/MM/yyyy", new Date(), { locale: fr })
    return isNaN(parsed.getTime())
      ? undefined
      : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  // dd-MM-yyyy
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const parsed = parse(value, "dd-MM-yyyy", new Date(), { locale: fr })
    return isNaN(parsed.getTime())
      ? undefined
      : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  // Format texte FR type : "1 juin 2025"
  if (/^\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4}$/.test(value)) {
    // "d MMMM yyyy" correspond bien à "1 juin 2025"
    const parsed = parse(value, "d MMMM yyyy", new Date(), { locale: fr })
    return isNaN(parsed.getTime())
      ? undefined
      : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  // Si aucun format strict ne matche → on ne parse pas
  return undefined
}

function isValidDate(date: Date | undefined): boolean {
  if (!date) return false
  return !isNaN(date.getTime())
}

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  label?: string
  fromYear?: number
  toYear?: number
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled = false,
  className,
  id = "date",
  label,
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const isControlled = value !== undefined

  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() =>
    normalizeToLocalDate(value)
  )

  const selectedDate = React.useMemo(
    () => (isControlled ? normalizeToLocalDate(value) : internalDate),
    [isControlled, value, internalDate]
  )

  const [month, setMonth] = React.useState<Date>(() => selectedDate || new Date())

  const [inputValue, setInputValue] = React.useState<string>(() =>
    formatDateForInput(selectedDate)
  )

  React.useEffect(() => {
    if (isControlled) {
      const normalized = normalizeToLocalDate(value)
      setInternalDate(normalized)
      setInputValue(formatDateForInput(normalized))
      if (normalized) {
        setMonth(normalized)
      }
    }
  }, [isControlled, value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // On essaie de parser UNIQUEMENT si le format est complet
    const parsed = parseDateString(newValue)
    if (parsed && isValidDate(parsed)) {
      const normalized = normalizeToLocalDate(parsed)

      if (!isControlled) {
        setInternalDate(normalized)
      }
      onChange?.(normalized)

      if (normalized) {
        setMonth(normalized)
      }
    }
    // Si pas parsable → on ne touche PAS à la date interne
  }

  const handleInputBlur = () => {
    if (selectedDate) {
      setInputValue(formatDateForInput(selectedDate))
    } else if (inputValue.trim() !== "") {
      // si l'utilisateur a tapé une date invalide ou incomplète → on reset
      const parsed = parseDateString(inputValue)
      if (parsed && isValidDate(parsed)) {
        const normalized = normalizeToLocalDate(parsed)
        if (!isControlled) {
          setInternalDate(normalized)
        }
        onChange?.(normalized)
        setInputValue(formatDateForInput(normalized))
        if (normalized) setMonth(normalized)
      } else {
        setInputValue("")
      }
    }
  }

  const handleSelect = (date: Date | undefined) => {
    const normalized = date ? normalizeToLocalDate(date) : undefined

    if (!isControlled) {
      setInternalDate(normalized)
    }

    onChange?.(normalized)
    setInputValue(formatDateForInput(normalized))
    setOpen(false)
  }

  const defaultFromYear = fromYear ?? new Date().getFullYear() - 100
  const defaultToYear = toYear ?? new Date().getFullYear() + 1

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
        </Label>
      )}
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={inputValue}
          placeholder={"ex: 13/09/2000"}
          disabled={disabled}
          className={`bg-background pr-10 ${className || ""}`}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              id={`${id}-picker`}
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0"
              disabled={disabled}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Sélectionner une date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={handleSelect}
              fromYear={defaultFromYear}
              toYear={defaultToYear}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
