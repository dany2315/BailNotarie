"use client";

import * as React from "react";
import Link from "next/link";
import { FileUp, Mail, MoreHorizontal, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MenuHeader, MenuItemRich } from "./menu-item";
import { ComplementComposer } from "@/components/complements/complement-composer";
import { formatPhone } from "@/lib/utils/phone-format";

/**
 * Une personne du dossier dans l'en-tête de la fiche : appeler, écrire, et « … » pour
 * lui demander une pièce ou une information (fenêtre « Demander » habituelle) ou ouvrir sa fiche.
 */
export function ContactCard({
  role,
  name,
  phone,
  email,
  href,
  bailId,
  target,
  canAsk,
}: {
  role: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  href: string | null;
  bailId: string;
  target: "OWNER" | "TENANT";
  canAsk: boolean;
}) {
  const [asking, setAsking] = React.useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card py-2 pl-3 pr-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{role}</span>
        <span className="truncate text-[14px] font-semibold" title={name || undefined}>
          {name || <span className="font-normal text-muted-foreground">Pas encore renseigné</span>}
        </span>
      </div>
      {phone && (
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          title={`Appeler · ${formatPhone(phone)}`}
          aria-label={`Appeler ${name ?? role} au ${formatPhone(phone)}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background hover:bg-muted"
        >
          <Phone className="size-4" />
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          title={`Écrire · ${email}`}
          aria-label={`Écrire à ${name ?? role} : ${email}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background hover:bg-muted"
        >
          <Mail className="size-4" />
        </a>
      )}
      {(href || canAsk) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label={`Autres actions : ${role}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-[19rem] rounded-xl p-1.5 shadow-lg">
            <MenuHeader kicker={role} title={name || "Pas encore renseigné"} />
            <DropdownMenuSeparator className="my-1" />
            {canAsk && (
              <DropdownMenuItem className="cursor-pointer rounded-lg px-2 py-1.5" onSelect={() => setAsking(true)}>
                <MenuItemRich icon={<FileUp />} title="Demander une pièce ou une information" hint="Vous relisez l'e-mail avant l'envoi" tone="primary" />
              </DropdownMenuItem>
            )}
            {/* Appeler et écrire : déjà en boutons sur la ligne, pas répétés ici. */}
            {href && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-1.5">
                  <Link href={href}>
                    <MenuItemRich icon={<UserRound />} title="Ouvrir la fiche client" hint="Coordonnées, pièces, autres dossiers" />
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {asking && <ComplementComposer bailId={bailId} target={target} open onOpenChange={setAsking} />}
    </div>
  );
}
