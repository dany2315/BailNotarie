"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { ControllerRenderProps } from "react-hook-form"
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip"
import { InfoIcon } from "lucide-react"

interface NumberInputGroupProps {
  value?: number | string
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  placeholder?: string
  className?: string
  unit?: string // Unité à afficher à droite (€, m², etc.)
  field?: ControllerRenderProps<any, any> | ReturnType<any>
  isDecimal?: boolean // Si true, utilise parseFloat au lieu de parseInt
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
  // Extraire la valeur du field si c'est un objet de react-hook-form
  const fieldValue = React.useMemo(() => {
    if (field && typeof field === 'object') {
      // Si field a une propriété value, l'utiliser
      if ('value' in field) {
        return field.value
      }
      // Sinon, field pourrait être le résultat de form.register() qui a onChange, onBlur, etc.
      // Dans ce cas, on utilise value directement
    }
    return undefined
  }, [field])

  const [internalValue, setInternalValue] = React.useState<string>(
    value?.toString() || fieldValue?.toString() || ""
  )

  React.useEffect(() => {
    const currentValue = fieldValue ?? value
    if (currentValue !== undefined && currentValue !== null) {
      setInternalValue(currentValue.toString())
    }
  }, [value, fieldValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    
    // Utiliser parseFloat pour les décimales, parseInt pour les entiers
    const numValue = isDecimal ? parseFloat(newValue) : parseInt(newValue, 10)
    
    if (!isNaN(numValue)) {
      const finalValue = min !== undefined ? Math.max(numValue, min) : numValue
      const maxValue = max !== undefined ? Math.min(finalValue, max) : finalValue
      
      // Mettre à jour la valeur de l'input pour que l'événement natif fonctionne
      e.target.value = maxValue.toString()
      
      // Appeler onChange du field si disponible
      // React-hook-form accepte l'événement natif
      if (field && typeof field === 'object' && 'onChange' in field) {
        const fieldObj = field as any
        // Utiliser l'événement natif modifié
        fieldObj.onChange(e)
      }
      if (onChange) {
        onChange(maxValue)
      }
    } else if (newValue === "") {
      // Pour les valeurs vides, mettre à jour l'événement
      e.target.value = ""
      
      // Appeler onChange du field si disponible
      if (field && typeof field === 'object' && 'onChange' in field) {
        const fieldObj = field as any
        fieldObj.onChange(e)
      }
      if (onChange) {
        onChange(0)
      }
    }
  }


  const currentNumValue = isDecimal ? (parseFloat(internalValue) || 0) : (parseInt(internalValue, 10) || 0)

  // Extraire les props du field pour react-hook-form
  const fieldProps = React.useMemo(() => {
    if (field && typeof field === 'object') {
      const props: any = {}
      // form.register() retourne un objet avec name, onChange, onBlur, ref
      // On doit extraire toutes les propriétés pour que react-hook-form fonctionne correctement
      const fieldObj = field as any
      
      // Le name est essentiel pour react-hook-form
      if (fieldObj.name !== undefined) {
        props.name = fieldObj.name
      }
      
      // onBlur est utilisé pour la validation
      if (fieldObj.onBlur) {
        props.onBlur = fieldObj.onBlur
      }
      
      // ref est utilisé pour le focus
      if (fieldObj.ref) {
        props.ref = fieldObj.ref
      }
      
      return props
    }
    return {}
  }, [field])

  return (
    <InputGroup className={className}>
      <InputGroupInput
        type="number"
        value={internalValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        {...fieldProps}
        className="text-right"
      />
      <InputGroupAddon align="inline-start" className={` ${unit ? "border-r-1 pr-3 bg-accent" : ""}`}>
            <InputGroupText>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

