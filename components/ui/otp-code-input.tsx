"use client";

import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

  return (
    <div className="space-y-3">
      <Label htmlFor={id} className="text-base sm:text-lg font-semibold text-center block">
        {label}
      </Label>
      <div className="flex justify-center">
        <InputOTP
          id={id}
          maxLength={6}
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
