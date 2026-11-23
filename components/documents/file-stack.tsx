"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Décalage et réduction de chaque carte cachée, comme la pile de l'espace notaire. */
const STACK_OFFSET_PX = 10;
const STACK_SCALE_FACTOR = 0.02;
/** Au-delà, les cartes cachées ne se voient plus : inutile de les dessiner. */
const MAX_VISIBLE_LAYERS = 3;

/**
 * Plusieurs fichiers pour une même pièce : empilés, la carte la plus récente devant,
 * les autres dépassant au-dessus. Survol, focus clavier ou toucher : la pile se déplie.
 * Les cartes gardent leur hauteur naturelle (le dessin ne dépend pas de leur taille).
 */
export function FileStack({
  children,
  className,
  cardClassName,
  label,
}: {
  /** Une carte par fichier, la plus récente en premier (chaque élément doit avoir une key). */
  children: React.ReactNode[];
  className?: string;
  /** Fond, bord et arrondi des cartes et des épaisseurs de la pile. */
  cardClassName?: string;
  /** Texte de la pastille, par défaut « N fichiers ». */
  label?: string;
}) {
  const items = React.Children.toArray(children);
  const [expanded, setExpanded] = React.useState(false);

  if (items.length <= 1) return <>{items}</>;

  const layers = Math.min(items.length - 1, MAX_VISIBLE_LAYERS);
  const card = cn("rounded-xl border bg-background shadow-sm", cardClassName);

  // Même arbre plié ou déplié : chaque fichier reste monté (seule sa visibilité change). Sinon,
  // ouvrir « Voir » ou « Supprimer » fait quitter la pile, qui se replie, démonte le bouton et
  // ferme sa fenêtre avant la fin de l'action.
  return (
    <div
      className={cn("min-w-0", className)}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
      }}
      onClick={() => {
        if (!expanded) setExpanded(true);
      }}
    >
      <div
        className={cn("relative", expanded && "flex flex-col gap-2")}
        style={expanded ? undefined : { paddingTop: layers * STACK_OFFSET_PX }}
      >
        {!expanded &&
          Array.from({ length: layers }, (_, i) => {
            const depth = layers - i;
            return (
              <div
                key={`layer-${depth}`}
                aria-hidden
                className={cn(card, "pointer-events-none absolute inset-x-0 bottom-0 transition-all duration-300 ease-out")}
                style={{
                  top: layers * STACK_OFFSET_PX,
                  transform: `translateY(-${depth * STACK_OFFSET_PX}px) scale(${1 - depth * STACK_SCALE_FACTOR})`,
                }}
              />
            );
          })}
        {items.map((item, index) => (
          <div
            key={(item as React.ReactElement).key ?? index}
            className={cn(card, "relative transition-all duration-300 ease-out", !expanded && index > 0 && "hidden")}
          >
            {item}
            {!expanded && index === 0 && (
              <span className="pointer-events-none absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
                {label ?? `${items.length} fichiers`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
