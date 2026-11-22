"use client";

import * as React from "react";
import Link from "next/link";
import { FileUp, Mail, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComplementComposer } from "@/components/complements/complement-composer";
import { formatPhone } from "@/lib/utils/phone-format";

const ICON_BUTTON = "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background hover:bg-muted";

/**
 * Une personne du dossier dans l'en-tête de la fiche : appeler, écrire, lui demander une pièce ou une
 * information (fenêtre « Demander » habituelle), ouvrir sa fiche client. Tout en boutons, sans menu.
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
        {href && name ? (
          <Link href={href} className="truncate text-[14px] font-semibold hover:text-primary hover:underline" title={`Ouvrir la fiche client · ${name}`}>
            {name}
          </Link>
        ) : (
          <span className="truncate text-[14px] font-semibold" title={name || undefined}>
            {name || <span className="font-normal text-muted-foreground">Pas encore renseigné</span>}
          </span>
        )}
      </div>
      {phone && (
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          title={`Appeler · ${formatPhone(phone)}`}
          aria-label={`Appeler ${name ?? role} au ${formatPhone(phone)}`}
          className={ICON_BUTTON}
        >
          <Phone className="size-4" />
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} title={`Écrire · ${email}`} aria-label={`Écrire à ${name ?? role} : ${email}`} className={ICON_BUTTON}>
          <Mail className="size-4" />
        </a>
      )}
      {canAsk && (
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 gap-1.5 px-2.5 text-[13px]"
          title="Demander une pièce ou une information"
          aria-label={`Demander une pièce ou une information à ${name ?? role}`}
          onClick={() => setAsking(true)}
        >
          <FileUp className="size-4" />
          Demander
        </Button>
      )}
      {href && !name && (
        <Link href={href} title="Ouvrir la fiche client" aria-label={`Ouvrir la fiche client : ${role}`} className={ICON_BUTTON}>
          <UserRound className="size-4" />
        </Link>
      )}
      {asking && <ComplementComposer bailId={bailId} target={target} open onOpenChange={setAsking} />}
    </div>
  );
}
