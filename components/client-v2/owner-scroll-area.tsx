"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Le conteneur de défilement de l'espace propriétaire.
 *
 * Sous 640 px, la navigation est une barre basse fixe : le contenu doit
 * réserver sa hauteur pour que la dernière ligne ne passe pas dessous. Sur le
 * parcours de création d'un bail, la barre est masquée — la réserve l'est
 * donc aussi, pour ne pas laisser un blanc en pied de formulaire.
 */
export function OwnerScrollArea({
  hideDockOn,
  className,
  children,
}: {
  hideDockOn: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const dockHidden = hideDockOn.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return (
    <main className={cn("min-h-0 flex-1 overflow-y-auto", !dockHidden && "pb-[76px] sm:pb-0", className)}>
      {children}
    </main>
  );
}
