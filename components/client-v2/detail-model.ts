import type { Tone } from "./owner-ui";

/* =========================================================================
   Le modèle d'une sous-page de détail.

   Le bien et le bail racontent la même chose : une identité, un état, des
   chiffres qui comptent, quelques actions, puis des blocs de champs. En
   décrivant cela une fois, les mises en page se comparent sur le même
   contenu — c'est la seule façon de juger une option pour ce qu'elle est.
   ========================================================================= */

export type DetailField = {
  label: string;
  value: string | null;
  wide?: boolean;
};

export type DetailSection = {
  id: string;
  title: string;
  icon: React.ElementType;
  fields?: DetailField[];
  /** Un contenu libre : une liste de baux, des pièces jointes… */
  node?: React.ReactNode;
};

export type DetailStat = {
  label: string;
  value: string;
};

export type DetailModel = {
  kind: "bien" | "bail";
  /** Le micro-libellé au-dessus du titre. */
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  status?: { label: string; tone: Tone; note?: string };
  icon: React.ElementType;
  backHref: string;
  trail: Array<{ label: string; href?: string }>;
  /** Les trois ou quatre chiffres qu'on vient chercher en premier. */
  stats: DetailStat[];
  actions?: React.ReactNode;
  sections: DetailSection[];
};
