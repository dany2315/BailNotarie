/**
 * Textes des e-mails de relance, partagés par le modèle d'e-mail (emails/mail-relance.tsx) et
 * l'aperçu de la fenêtre « Relancer » : ce que l'équipe voit est ce que le client reçoit.
 */

export type RelanceReason =
  | "OWNER_FORM"
  | "TENANT_TO_ADD"
  | "TENANT_FORM"
  | "TENANT_VIA_OWNER"
  | "MISSING_ITEMS"
  | "RENT_CAP"
  | "DIAGNOSTICS";

export interface RelanceEmailInput {
  reason: RelanceReason;
  /** Nom affiché après « Bonjour ». */
  name: string;
  /** Adresse du bien concerné (logement ou local commercial). */
  address: string;
  /** Lien d'action : formulaire, ou espace client. */
  actionUrl: string;
  /** Éléments listés (éléments manquants, ou détail du loyer). */
  items?: string[];
  /** Nom du locataire, pour la relance du propriétaire à son sujet. */
  tenantName?: string;
  /** Message libre ajouté par l'équipe. */
  note?: string;
  /** Texte de l'e-mail modifié dans l'aperçu : remplace le texte prévu (paragraphes séparés par une ligne vide). */
  body?: string;
}

/** Longueur maximale du texte d'une relance modifié dans l'aperçu. */
export const RELANCE_BODY_MAX = 3000;

type RelanceContent = {
  preview: string;
  /** Petit titre au-dessus du titre (facultatif) et sa couleur. */
  kicker?: { text: string; tone: "blue" | "amber" };
  /** Titre de l'e-mail. */
  title: string;
  intro: (p: RelanceEmailInput) => string[];
  /** Encadré sous le texte (facultatif). */
  card?: { label: string; text: string };
  button: string;
  /** Ligne d'aide sous le bouton (facultative). */
  hint?: string;
  /** Formule de fin de la signature. */
  closing?: string;
};

export const RELANCE_CONTENT: Record<RelanceReason, RelanceContent> = {
  OWNER_FORM: {
    preview: "Vos réponses sont enregistrées : il ne vous reste que quelques questions.",
    title: "Reprenez là où vous vous étiez arrêté",
    intro: (p) => [
      `Vous avez déjà commencé votre bail notarié pour le bien situé ${p.address}. Vos réponses sont enregistrées : il ne vous reste que quelques questions avant que nous puissions vérifier votre dossier.`,
    ],
    button: "Terminer mon dossier",
    hint: "Bloqué sur une question ? Répondez à cet e-mail, on vous aide.",
  },
  TENANT_TO_ADD: {
    preview: "Indiquez son adresse : nous lui envoyons son formulaire et nous occupons du reste.",
    title: "Votre bail est prêt à accueillir votre locataire",
    intro: (p) => [
      `Votre dossier pour le bien situé ${p.address} est complet de votre côté. Dès que vous avez trouvé votre locataire, indiquez simplement son adresse e-mail : nous lui envoyons son formulaire, nous le relançons et nous vérifions ses pièces.`,
    ],
    card: { label: "Ce que vous n'aurez pas à faire", text: "Lui expliquer la démarche, collecter ses justificatifs ou le relancer : on s'en charge." },
    button: "Indiquer mon locataire",
    hint: "Pas encore de locataire ? Aucun souci, votre dossier reste prêt.",
  },
  TENANT_FORM: {
    preview: "Votre propriétaire a terminé sa partie. Quelques minutes suffisent pour la vôtre.",
    title: "Votre bail n'attend plus que vous",
    intro: (p) => [
      `Votre propriétaire a terminé sa partie du bail notarié pour le logement situé ${p.address}. Il ne manque plus que vos informations pour que le notaire prépare l'acte.`,
    ],
    button: "Compléter mes informations",
    hint: "Vos réponses déjà saisies sont conservées.",
  },
  TENANT_VIA_OWNER: {
    preview: "Un message de votre part suffit souvent à débloquer la situation.",
    title: "Un message de votre part peut tout débloquer",
    intro: (p) => [
      `Nous avons relancé ${p.tenantName || "votre locataire"} plusieurs fois pour votre bail notarié (${p.address}), sans réponse. Souvent, notre e-mail est simplement arrivé dans ses indésirables : un mot de votre part suffit en général.`,
      "Vous pouvez aussi vérifier son adresse e-mail et la corriger depuis votre espace.",
    ],
    button: "Voir mon dossier",
    closing: "Merci pour votre aide,",
  },
  MISSING_ITEMS: {
    preview: "Il ne manque plus que quelques éléments à votre dossier.",
    title: "Il ne manque plus que quelques éléments",
    intro: (p) => [`Pour finaliser votre dossier de bail notarié (${p.address}), il nous manque encore :`],
    button: "Accéder à mon espace",
  },
  RENT_CAP: {
    preview: "Votre loyer dépasse le plafond autorisé pour ce logement. Deux solutions possibles.",
    kicker: { text: "À régler avant la signature", tone: "amber" },
    title: "Sécurisons votre loyer avant de signer",
    intro: (p) => [
      `Le logement situé ${p.address} est en zone d'encadrement des loyers. Le loyer prévu dépasse le plafond autorisé pour ce logement :`,
    ],
    card: {
      label: "Pourquoi c'est important",
      text: "Un loyer au-dessus du plafond peut être contesté par le locataire, avec remboursement du trop-perçu, et exposer à une amende. Mieux vaut le régler maintenant.",
    },
    button: "Choisir ma solution",
    closing: "Nous restons à vos côtés,",
  },
  DIAGNOSTICS: {
    preview: "Voici ce qu'il reste à régler sur vos diagnostics avant la signature.",
    kicker: { text: "Vos diagnostics", tone: "amber" },
    title: "Vos diagnostics : quelques points à régler",
    intro: (p) => [`Nous avons relu les diagnostics du bien situé ${p.address}. Voici ce qu'il reste à régler avant la signature :`],
    button: "Envoyer mes diagnostics",
  },
};

export const RELANCE_OUTRO: Partial<Record<RelanceReason, string>> = {
  RENT_CAP:
    "Deux solutions : ramener le loyer au plafond, ou justifier un complément de loyer si le logement a des caractéristiques exceptionnelles (vue, terrasse, prestations…). Répondez-nous en précisant votre choix et, le cas échéant, les éléments qui justifient le complément.",
  MISSING_ITEMS: "Vous pouvez nous les transmettre depuis votre espace client ou en répondant à cet e-mail.",
  DIAGNOSTICS: "Envoyez les documents depuis votre espace, ou répondez simplement à cet e-mail pour toute question.",
};


export const RELANCE_SUBJECTS: Record<RelanceReason, string> = {
  OWNER_FORM: "Votre dossier vous attend là où vous l'avez laissé",
  TENANT_TO_ADD: "Vous avez trouvé votre locataire ? Un e-mail suffit pour la suite",
  TENANT_FORM: "Votre bail notarié n'attend plus que vous",
  TENANT_VIA_OWNER: "Votre locataire n'a pas encore répondu : un petit coup de pouce ?",
  MISSING_ITEMS: "Votre bail notarié : il ne manque plus que quelques éléments",
  RENT_CAP: "Sécurisons votre loyer avant la signature",
  DIAGNOSTICS: "Vos diagnostics : quelques points à régler avant la signature",
};

/** Contenu de l'e-mail de relance, tel qu'il sera envoyé. */
export function relanceEmailContent(input: RelanceEmailInput) {
  const content = RELANCE_CONTENT[input.reason];
  return {
    subject: RELANCE_SUBJECTS[input.reason],
    preview: content.preview,
    greeting: `Bonjour${input.name ? ` ${input.name}` : ""},`,
    paragraphs: input.body?.trim()
      ? input.body
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
      : content.intro(input),
    items: input.items ?? [],
    outro: RELANCE_OUTRO[input.reason] ?? null,
    note: input.note?.trim() || null,
    button: content.button,
    kicker: content.kicker ?? null,
    title: content.title,
    card: content.card ?? null,
    hint: content.hint ?? null,
    closing: content.closing ?? "À très vite,",
  };
}
