"use client";

import { Phone } from "lucide-react";
import { Button } from "./button";

interface PhoneButtonProps {
  phoneNumber: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  onClick?: () => void;
}

export function PhoneButton({ phoneNumber, className, size = "default", onClick }: PhoneButtonProps) {
  const handleCall = () => {
    window.location.href = `tel:${phoneNumber}`;
    onClick?.();
  };

  return (
    <Button 
      onClick={handleCall}
      className={`bg-green-600 hover:bg-green-700 text-white font-semibold ${className}`}
      size={size}
    >
      <Phone className="mr-2 h-4 w-4" />
      {phoneNumber}
    </Button>
  );
}