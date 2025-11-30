"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const pathname = usePathname();
  const allSegments = pathname.split("/").filter(Boolean);
  
  // Filtrer "interface" car il correspond à l'icône maison
  const segments = allSegments.filter(segment => segment !== "interface");

  // Si on est sur /interface ou /interface/, ne rien afficher sauf l'icône maison
  if (segments.length === 0) {
    return (
      <nav className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground min-w-0 flex-1">
        <Link
          href="/interface"
          className="hover:text-foreground transition-colors flex-shrink-0"
        >
          <Home className="size-4" />
        </Link>
      </nav>
    );
  }

  // Reconstruire les hrefs en incluant "interface" dans le chemin
  const breadcrumbs = segments.map((segment, index) => {
    const pathSegments = ["interface", ...segments.slice(0, index + 1)];
    const href = "/" + pathSegments.join("/");
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    return { href, label };
  });

  // Sur mobile, ne montrer que les 2 derniers segments pour économiser l'espace
  const displayBreadcrumbs = breadcrumbs.slice(-2);

  return (
    <nav className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground min-w-0 flex-1">
      <Link
        href="/interface"
        className="hover:text-foreground transition-colors flex-shrink-0"
      >
        <Home className="size-4" />
      </Link>
      {/* Sur mobile, montrer "..." si on a tronqué des segments */}
      {breadcrumbs.length > 2 && (
        <>
          <ChevronRight className="size-3 sm:size-4 flex-shrink-0" />
          <span>...</span>
        </>
      )}
      {displayBreadcrumbs.map((crumb) => {
        const originalIndex = breadcrumbs.findIndex(b => b.href === crumb.href);
        const isLastInOriginal = originalIndex === breadcrumbs.length - 1;
        
        return (
          <div key={crumb.href} className="flex items-center gap-1 sm:gap-2 min-w-0">
            <ChevronRight className="size-3 sm:size-4 flex-shrink-0" />
            {isLastInOriginal ? (
              <span className="text-foreground font-medium truncate">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}


