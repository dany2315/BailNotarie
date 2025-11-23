"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { fr } from "date-fns/locale"


interface DatePickerProps {
    value?: Date | string
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    id?: string
    fromYear?: number
    toYear?: number
  }

export function DatePicker({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled = false,
  className,
  id,
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(undefined)

  // Convertir la valeur en Date si c'est une string
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    if (typeof value === "string") {
      const date = new Date(value)
      return isNaN(date.getTime()) ? undefined : date
    }
    return undefined
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    if (date) {
      setOpen(false)
    }
  }

  // Configuration pour les années (par défaut: 100 ans en arrière jusqu'à aujourd'hui)
  const defaultFromYear = fromYear ?? new Date().getFullYear() - 100
  const defaultToYear = toYear ?? new Date().getFullYear()

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="w-full justify-between font-normal text-ellipsis truncate"
          >
            {dateValue ? (
            format(dateValue, "PPP", { locale: fr })
          ) : (
            placeholder
          )}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            captionLayout="dropdown"
            onSelect={(date) => {
              setDate(date)
              setOpen(false)
            }}
            fromYear={defaultFromYear}
            toYear={defaultToYear}
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}


