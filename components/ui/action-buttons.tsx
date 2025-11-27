"use client";

import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export function CallButton() {
  return (
    <Button 
      variant="outline"
      className="text-[#4373f5] w-full space-x-2"
      onClick={() => window.location.href = 'tel:0749387756'}
    >
      <Phone className="size-4" />
      <span>Appeler maintenant</span>
    </Button>
  );
}

export function ContactButton() {
  return (
    <Button 
      className="w-full"
      onClick={() => {
        window.location.href = '/commencer';
      }}
    >
      <span>Créer mon bail notarié</span>
    </Button>
  );
}
