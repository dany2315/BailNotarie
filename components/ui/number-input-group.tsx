"use client"

import * as React from "react"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { UseFormRegisterReturn } from "react-hook-form"

interface NumberInputGroupProps {
  value?: number | string
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  placeholder?: string
  className?: string
  unit?: string
  field?: UseFormRegisterReturn<any>
  isDecimal?: boolean
}

export function NumberInputGroup({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  placeholder,
  className,
  unit,
  field,
  isDecimal = false,
}: NumberInputGroupProps) {
  // Handler pour notre onChange custom
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      const numValue = isDecimal ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
      if (!isNaN(numValue)) {
        onChange(numValue)
      } else if (e.target.value === "") {
        onChange(0)
      }
    }
  }, [onChange, isDecimal])

  // Si on a un field de react-hook-form, on utilise ses props directement
  // Sinon on utilise les props value/onChange
  const inputProps = field ? {
    ...field,
    // Si on a aussi un onChange custom, on le combine
    onChange: onChange ? (e: React.ChangeEvent<HTMLInputElement>) => {
      field.onChange(e) // Appeler d'abord le onChange de react-hook-form
      handleChange(e)   // Puis notre onChange custom
    } : field.onChange,
  } : {
    value: value?.toString() ?? "",
    onChange: handleChange,
  }

  return (
    <InputGroup className={className}>
      <InputGroupInput
        type="number"
        {...inputProps}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        className="text-right"
      />
      {unit && (
        <InputGroupAddon align="inline-start" className="border-r-1 pr-3 bg-accent">
          <InputGroupText>{unit}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
