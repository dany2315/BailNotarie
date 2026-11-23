"use client";

import type { ClipboardEvent } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const OTP_LENGTH = 6;

// Garde seulement les chiffres : « 482 913 » ou « Code : 482913 » collés
// depuis un e-mail donnent bien 482913.
function keepDigits(text: string): string {
  return text.replace(/\D/g, "");
}

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
  label?: string;
  id?: string;
}

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  error,
  autoFocus = false,
  label = "Code de vérification",
  id = "otp-code",
}: OtpCodeInputProps) {
  const errorId = `${id}-error`;

  // input-otp insère le texte collé à la position du curseur : un code complet
  // collé dans un champ déjà entamé garderait les anciens chiffres. Il remplace
  // donc toute la saisie.
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = keepDigits(event.clipboardData.getData("text/plain"));
    if (digits.length >= OTP_LENGTH) {
      onChange(digits.slice(0, OTP_LENGTH));
    }
  };

  return (
    <div className="space-y-3">
      {label ? (
        <Label htmlFor={id} className="text-base sm:text-lg font-semibold text-center block">
          {label}
        </Label>
      ) : null}
      <div className="flex justify-center">
        <InputOTP
          id={id}
          name="otp"
          // Le navigateur et le clavier peuvent proposer le code reçu
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          pasteTransformer={keepDigits}
          onPaste={handlePaste}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          className="justify-center w-full"
        >
          <InputOTPGroup className="gap-2 sm:gap-3">
            <InputOTPSlot index={0} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg font-semibold" />
            <InputOTPSlot index={1} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg font-semibold" />
            <InputOTPSlot index={2} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg font-semibold" />
            <InputOTPSlot index={3} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg font-semibold" />
            <InputOTPSlot index={4} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg font-semibold" />
            <InputOTPSlot index={5} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg font-semibold" />
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive text-center">
          {error}
        </p>
      )}
    </div>
  );
}
