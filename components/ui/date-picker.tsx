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
import { fr } from "react-day-picker/locale";

/**
 * Formate une date pour l'affichage dans l'input (format français long)
 * Utilise toLocaleDateString avec locale fr et timezone UTC
 */
function formatDate(date: Date | undefined): string {
  if (!date) {
    return ""
  }
  // Utiliser UTC pour éviter les problèmes de fuseau horaire
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  return utcDate.toLocaleDateString("fr", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * Normalise une date en UTC (sans décalage de fuseau horaire)
 */
function normalizeToLocalDate(date: Date | string | undefined): Date | undefined {
  if (!date) return undefined

  if (date instanceof Date) {
    // Créer une date UTC à partir des composants de la date
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  }

  if (typeof date === "string") {
    // Si c'est au format yyyy-MM-dd, parser directement
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10)
      const month = parseInt(dateMatch[2], 10) - 1
      const day = parseInt(dateMatch[3], 10)
      return new Date(Date.UTC(year, month, day))
    }

    // Sinon, parser avec new Date et normaliser en UTC
    const parsed = new Date(date)
    if (!isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
    }
  }

  return undefined
}

export function formatDateToLocalString(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  return utcDate.toLocaleDateString("fr", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  })
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
  const [isEditing, setIsEditing] = React.useState(false)
  const previousValueRef = React.useRef(value)

  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() =>
    normalizeToLocalDate(value)
  )

  const selectedDate = React.useMemo(
    () => (isControlled ? normalizeToLocalDate(value) : internalDate),
    [isControlled, value, internalDate]
  )

  const [month, setMonth] = React.useState<Date>(() => selectedDate || new Date())

  const [inputValue, setInputValue] = React.useState<string>(() =>
    formatDate(selectedDate)
  )

  React.useEffect(() => {
    // Ne reformater que si la valeur a changé de l'extérieur (pas par l'utilisateur)
    if (isControlled && !isEditing && value !== previousValueRef.current) {
      const normalized = normalizeToLocalDate(value)
      setInternalDate(normalized)
      setInputValue(formatDate(normalized))
      if (normalized) {
        setMonth(normalized)
      }
      previousValueRef.current = value
    }
  }, [isControlled, value, isEditing])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setIsEditing(true)
    setInputValue(newValue)

    // Parser directement avec new Date comme dans Calendar28
    const parsed = new Date(newValue)
    if (isValidDate(parsed)) {
      const normalized = normalizeToLocalDate(parsed)

      if (!isControlled) {
        setInternalDate(normalized)
      }
      onChange?.(normalized)

      if (normalized) {
        setMonth(normalized)
      }
    }
  }

  const handleInputFocus = () => {
    setIsEditing(true)
  }

  const handleInputBlur = () => {
    setIsEditing(false)
    // Reformater seulement si la date est valide
    if (selectedDate) {
      setInputValue(formatDate(selectedDate))
    } else if (inputValue.trim() !== "") {
      // Essayer de parser la valeur actuelle
      const parsed = new Date(inputValue)
      if (isValidDate(parsed)) {
        const normalized = normalizeToLocalDate(parsed)
        if (!isControlled) {
          setInternalDate(normalized)
        }
        onChange?.(normalized)
        setInputValue(formatDate(normalized))
        if (normalized) setMonth(normalized)
      } else {
        // Si invalide, réinitialiser
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
    setInputValue(formatDate(normalized))
    setIsEditing(false)
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
          placeholder={placeholder || "01 juin 2025"}
          disabled={disabled}
          className={`bg-background pr-10 ${className || ""}`}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
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
              timeZone={"UTC"}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
