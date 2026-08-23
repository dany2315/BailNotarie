/**
 * Maillage interne editorial du blog.
 *
 * Le constat de depart : les deux articles qui performent le mieux comptent 12
 * et 14 liens sortants, tandis que sept articles n'en ont aucun ou un seul —
 * et ce sont exactement les sous-performeurs. Un article sans lien entrant ni
 * sortant ne recoit aucune autorite du reste du site et n'en transmet aucune.
 *
 * La structure retenue est une etoile autour de trois destinations :
 *  - la page pilier "cout d'un bail notarie", qui concentre 47 % du trafic ;
 *  - le simulateur de prix, meilleur taux de clic du site (5,32 %) mais
 *    quasiment jamais lie depuis les articles ;
 *  - l'article de definition, porte d'entree de la requete "bail notarie".
 *
 * Les libelles de lien portent les mots-cles de la page cible : c'est l'ancre
 * qui indique a Google sur quoi la page de destination doit etre positionnee.
 */

export interface BlogLink {
  /** Chemin absolu interne. */
  href: string;
  /** Ancre du lien : doit decrire la page cible avec ses mots-cles. */
  label: string;
  /** Phrase de contexte affichee sous l'ancre. */
  hint: string;
}

const COUT: BlogLink = {
  href: "/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets",
  label: "Combien coûte un bail de location notarié",
  hint: "Tarif réglementé, frais annexes et répartition entre bailleur et locataire.",
};

const SIMULATEUR: BlogLink = {
  href: "/simulateur-prix-bail-notarie",
  label: "Simulateur de prix du bail notarié",
  hint: "Estimez le coût TTC à partir de votre loyer hors charges.",
};

const DEFINITION: BlogLink = {
  href: "/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir",
  label: "Bail notarié : définition et valeur juridique",
  hint: "Ce que change concrètement le passage devant notaire.",
};

const AUTHENTIQUE: BlogLink = {
  href: "/blog/bail-authentique-notaire",
  label: "Bail authentique chez le notaire",
  hint: "Définition, prix et déroulé de la signature.",
};

const FORCE_EXEC: BlogLink = {
  href: "/blog/force-executoire-lavantage-majeur-du-bail-notarie",
  label: "Force exécutoire du bail notarié",
  hint: "Pourquoi un bail déposé chez le notaire ne suffit pas.",
};

const EXPULSION: BlogLink = {
  href: "/blog/bail-notarie-et-expulsion-efficacite-juridique-et-strategie-de-recouvrement",
  label: "Bail notarié et expulsion",
  hint: "Ce que le titre exécutoire permet, et ce qu'il ne permet pas.",
};

const SAISIE: BlogLink = {
  href: "/blog/saisie-sur-salaire-et-bail-notarie-la-procedure-de-recouvrement-acceleree-reforme-2025",
  label: "Saisie sur salaire et loyers impayés",
  hint: "La procédure de recouvrement depuis la réforme 2025.",
};

const ETAPES: BlogLink = {
  href: "/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet",
  label: "Les étapes pour établir un bail notarié",
  hint: "Pièces à fournir, délais et déroulé jusqu'à la signature.",
};

const COMPARATIF: BlogLink = {
  href: "/blog/bail-notarie-vs-bail-classique-analyse-comparative",
  label: "Bail notarié ou bail classique",
  hint: "Comparatif du coût, de la sécurité et du recouvrement.",
};

const DISTANCE: BlogLink = {
  href: "/blog/bail-notarie-a-distance-signer-en-securite-avec-la-procuration",
  label: "Signer un bail notarié à distance",
  hint: "Procuration authentique et signature en visioconférence.",
};

const OBLIGATIONS: BlogLink = {
  href: "/blog/les-obligations-legales-dans-un-bail-notarie",
  label: "Les obligations légales du bail notarié",
  hint: "Clauses obligatoires et devoirs de chaque partie.",
};

const COMMERCIAL: BlogLink = {
  href: "/blog/bail-commercial",
  label: "Bail commercial 3/6/9 : durée et résiliation",
  hint: "Congé triennal, révision du loyer, renouvellement et indemnité d'éviction.",
};

const COMMERCIAL_NOTAIRE: BlogLink = {
  href: "/blog/bail-commercial-notarie-contrat-3-6-9",
  label: "Bail commercial notarié",
  hint: "Quand le notaire est obligatoire et ce que le titre exécutoire change.",
};

const DEROGATOIRE: BlogLink = {
  href: "/blog/bail-derogatoire-article-l145-5-code-commerce",
  label: "Bail dérogatoire : durée maximale de 36 mois",
  hint: "Article L.145-5 et risque de requalification en bail 3/6/9.",
};

const MEUBLE: BlogLink = {
  href: "/blog/location-meublee-ou-location-nue-quelles-differences",
  label: "Location meublée ou location nue",
  hint: "Bail, préavis et fiscalité comparés.",
};

const DIAGNOSTICS: BlogLink = {
  href: "/blog/diagnostics-immobiliers-2026-durees-de-validite-couts-et-pieges-juridiques",
  label: "Diagnostics immobiliers obligatoires",
  hint: "Durées de validité et conséquences d'un document périmé.",
};

/**
 * Liens contextuels par article, indexes sur le slug.
 * Trois a quatre destinations par article, choisies pour leur proximite de sujet.
 */
export const BLOG_RELATED_LINKS: Record<string, BlogLink[]> = {
  "bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir": [COUT, SIMULATEUR, ETAPES, FORCE_EXEC],
  "les-etapes-pour-etablir-un-bail-notarie-guide-complet": [COUT, SIMULATEUR, DISTANCE, OBLIGATIONS],
  "force-executoire-lavantage-majeur-du-bail-notarie": [EXPULSION, SAISIE, COMPARATIF, COUT],
  "bail-notarie-vs-bail-classique-analyse-comparative": [COUT, SIMULATEUR, FORCE_EXEC, DEFINITION],
  "les-obligations-legales-dans-un-bail-notarie": [DEFINITION, ETAPES, DIAGNOSTICS, COUT],
  "cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets": [
    SIMULATEUR,
    AUTHENTIQUE,
    COMPARATIF,
    ETAPES,
  ],
  "bail-notarie-a-distance-signer-en-securite-avec-la-procuration": [ETAPES, COUT, SIMULATEUR, DEFINITION],
  "saisie-sur-salaire-et-bail-notarie-la-procedure-de-recouvrement-acceleree-reforme-2025": [
    FORCE_EXEC,
    EXPULSION,
    COMPARATIF,
    COUT,
  ],
  "diagnostics-immobiliers-2026-durees-de-validite-couts-et-pieges-juridiques": [
    OBLIGATIONS,
    ETAPES,
    MEUBLE,
    COUT,
  ],
  "bail-notarie-et-expulsion-efficacite-juridique-et-strategie-de-recouvrement": [
    FORCE_EXEC,
    SAISIE,
    COUT,
    DEFINITION,
  ],
  "bail-authentique-notaire": [COUT, SIMULATEUR, COMPARATIF, ETAPES],
  "bailnotarie-plateforme-digitale-bail-notarie": [ETAPES, COUT, SIMULATEUR, DISTANCE],
  "bail-commercial-notarie-contrat-3-6-9": [COMMERCIAL, DEROGATOIRE, FORCE_EXEC, COUT],
  "bail-derogatoire-article-l145-5-code-commerce": [COMMERCIAL, COMMERCIAL_NOTAIRE, FORCE_EXEC, SIMULATEUR],
  "bail-commercial": [COMMERCIAL_NOTAIRE, DEROGATOIRE, FORCE_EXEC, COUT],
  "location-meublee-ou-location-nue-quelles-differences": [DIAGNOSTICS, OBLIGATIONS, COUT, SIMULATEUR],
};

/** Liens contextuels d'un article, en excluant un eventuel auto-lien. */
export function getRelatedLinks(slug: string): BlogLink[] {
  return (BLOG_RELATED_LINKS[slug] ?? []).filter((l) => !l.href.endsWith(`/${slug}`));
}

/** Visuel de repli pour les destinations qui ne sont pas des articles. */
const FALLBACK_IMAGE = "/og-cover-v2.png";

export interface BlogLinkWithMedia extends BlogLink {
  /** Vignette : image de l'article cible, ou visuel de repli. */
  image: string;
}

/**
 * Liens contextuels enrichis de la vignette de la page cible, pour un rendu
 * identique a celui des cartes d'articles.
 */
export function getRelatedLinksWithMedia(
  slug: string,
  articles: ReadonlyArray<{ slug: string; imageUrl?: string }>
): BlogLinkWithMedia[] {
  return getRelatedLinks(slug).map((link) => {
    const targetSlug = link.href.startsWith("/blog/")
      ? link.href.slice("/blog/".length)
      : null;
    const article = targetSlug
      ? articles.find((a) => a.slug === targetSlug)
      : undefined;
    return { ...link, image: article?.imageUrl || FALLBACK_IMAGE };
  });
}
