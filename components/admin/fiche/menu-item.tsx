import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contenu d'une ligne de menu de la fiche dossier : icône dans une pastille, titre et une courte
 * explication. À placer dans un DropdownMenuItem.
 */
export function MenuItemRich({
  icon,
  title,
  hint,
  tone = "default",
}: {
  icon: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "danger" && "bg-red-50 text-red-700",
          tone === "default" && "bg-muted text-foreground/80",
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn("text-[14px] font-medium leading-snug", tone === "danger" && "text-red-700")}>{title}</span>
        {hint && <span className="truncate text-[12px] leading-snug text-muted-foreground">{hint}</span>}
      </span>
    </span>
  );
}

/** En-tête d'un menu : de qui ou de quoi il s'agit. */
export function MenuHeader({ kicker, title }: { kicker: string; title: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col px-2.5 pb-1.5 pt-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{kicker}</span>
      <span className="truncate text-[14.5px] font-semibold">{title}</span>
    </span>
  );
}
