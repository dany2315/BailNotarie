"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MissingRequestRecipient {
  /** « Propriétaire », « Locataire ». */
  role: string;
  name: string;
  email: string;
  items: string[];
}

function mailtoHref(recipient: MissingRequestRecipient, address: string) {
  const subject = `Votre dossier de bail notarié · éléments manquants`;
  const body = [
    "Bonjour,",
    "",
    `Pour finaliser votre dossier de bail notarié (${address}), il nous manque encore :`,
    ...recipient.items.map((item) => `- ${item}`),
    "",
    "Vous pouvez nous les transmettre en réponse à ce message ou depuis votre espace client.",
    "",
    "Bien cordialement,",
    "L'équipe BailNotarie",
  ].join("\n");
  return `mailto:${encodeURIComponent(recipient.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * « Demander les pièces manquantes » : prépare dans la messagerie de
 * l'administrateur un e-mail au client listant ce qui manque. Rien n'est
 * envoyé par l'application ; l'administrateur relit et envoie lui-même.
 */
export function RequestMissingButton({
  recipients,
  address,
  className,
}: {
  recipients: MissingRequestRecipient[];
  address: string;
  className?: string;
}) {
  const usable = recipients.filter((r) => r.email && r.items.length > 0);
  if (usable.length === 0) return null;

  if (usable.length === 1) {
    return (
      <Button asChild variant="outline" className={cn("gap-2", className)}>
        <a href={mailtoHref(usable[0], address)} title={`E-mail à ${usable[0].name} (${usable[0].email})`}>
          Demander les pièces manquantes
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          Demander les pièces manquantes
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {usable.map((recipient) => (
          <DropdownMenuItem key={recipient.role} asChild className="min-h-11 cursor-pointer">
            <a href={mailtoHref(recipient, address)} className="flex flex-col items-start gap-0.5">
              <span className="font-medium">
                {recipient.role} · {recipient.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {recipient.items.length} élément{recipient.items.length > 1 ? "s" : ""} · {recipient.email}
              </span>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
