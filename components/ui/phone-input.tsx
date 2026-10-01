"use client";

import PhoneInputLib from "react-phone-number-input";
import { cn } from "@/lib/utils";
import { parsePhoneNumber } from "@/lib/utils/phone-validation";
import type { E164Number } from "libphonenumber-js";
import { useMemo } from "react";

interface PhoneInputProps {
  /** Repris par la saisie elle-même, pour qu'un libellé puisse la désigner. */
  id?: string;
  value?: string | E164Number;
  onChange?: (value: E164Number | undefined) => void;
  defaultCountry?: "FR" | "US" | "GB" | string;
  international?: boolean;
  countryCallingCodeEditable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  id,
  value,
  onChange,
  defaultCountry = "FR",
  international = true,
  countryCallingCodeEditable = false,
  placeholder = "Numéro de téléphone",
  disabled = false,
  className,
}: PhoneInputProps) {
  // Convertir la valeur au format E.164 si nécessaire
  const e164Value = useMemo(() => {
    if (!value) return undefined;
    if (typeof value === "string") {
      return parsePhoneNumber(value) as E164Number | undefined;
    }
    return value;
  }, [value]);

  const handleChange = (newValue: E164Number | undefined) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <PhoneInputLib
      id={id}
      value={e164Value}
      onChange={handleChange}
      defaultCountry={defaultCountry as any}
      international={international}
      countryCallingCodeEditable={countryCallingCodeEditable}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("shadcn-input-style", className)}
    />
  );
}

