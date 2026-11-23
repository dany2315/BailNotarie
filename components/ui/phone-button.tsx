"use client";

import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface PhoneButtonProps {
  phoneNumber: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  onClick?: () => void;
  withLabel?: boolean;
}

export function PhoneButton({ phoneNumber, className, size = "default", onClick ,withLabel = true }: PhoneButtonProps) {
  const handleCall = () => {
    window.location.href = `tel:${phoneNumber}`;
    onClick?.();
  };

  return (
    <Button 
      onClick={handleCall}
      // `cn` et non une concaténation : les classes de l'appelant doivent
      // pouvoir remplacer celles-ci, et non s'y ajouter en espérant gagner.
      className={cn("cursor-pointer bg-green-600 font-semibold text-white hover:bg-green-700", className)}
      size={size}
    >
      <Phone className={`${withLabel ? "mr-2 h-4 w-4" : " h-4 w-4"}`} />
      {withLabel ? phoneNumber : ""}
    </Button>
  );
}