"use client";

import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export function CallButton() {
  return (
    <Button 
      className="bg-blue-600 hover:bg-blue-700 text-white w-full"
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
      variant="outline"
      className="w-full"
      onClick={() => {
        window.location.href = '/#contact';
      }}
    >
      <span>Demander un devis</span>
    </Button>
  );
}
