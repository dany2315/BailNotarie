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
}

export const RELANCE_CONTENT: Record<RelanceReason, { preview: string; intro: (p: RelanceEmailInput) => string[]; button: string }> = {
  OWNER_FORM: {
    preview: "Votre dossier de bail notarié n'est pas encore terminé",
    intro: (p) => [
      `Votre dossier de bail notarié pour le bien situé ${p.address} n'est pas encore terminé.`,
      "Il vous reste à compléter votre formulaire et à le valider pour que nous puissions vérifier votre dossier. Vos informations déjà saisies sont conservées.",
    ],
    button: "Reprendre mon dossier",
  },
  TENANT_TO_ADD: {
    preview: "Indiquez-nous votre locataire",
    intro: (p) => [
      `Votre dossier de bail notarié pour le bien situé ${p.address} est bien enregistré.`,
      "Pour continuer, il nous faut les coordonnées de votre locataire : dès que vous l'avez trouvé, indiquez son adresse e-mail depuis votre espace, nous lui enverrons son formulaire.",
      "Si vous n'avez pas encore de locataire, vous pouvez ignorer ce message.",
    ],
    button: "Indiquer mon locataire",
  },
  TENANT_FORM: {
    preview: "Votre formulaire locataire est en attente",
    intro: (p) => [
      `Votre propriétaire a lancé un bail notarié pour le bien situé ${p.address}.`,
      "Votre formulaire locataire n'a pas encore été envoyé : merci de le compléter pour que le bail puisse avancer. Vos informations déjà saisies sont conservées.",
    ],
    button: "Compléter mon formulaire",
  },
  TENANT_VIA_OWNER: {
    preview: "Votre locataire n'a pas encore rempli son formulaire",
    intro: (p) => [
      `Pour votre bail notarié (${p.address}), ${p.tenantName || "votre locataire"} n'a pas encore rempli son formulaire, malgré nos relances.`,
      "Pourriez-vous le lui rappeler, ou vérifier avec lui que l'adresse e-mail indiquée est la bonne ? Vous pouvez la corriger depuis votre espace.",
    ],
    button: "Voir mon dossier",
  },
  MISSING_ITEMS: {
    preview: "Il manque encore quelques éléments à votre dossier",
    intro: (p) => [`Pour finaliser votre dossier de bail notarié (${p.address}), il nous manque encore :`],
    button: "Accéder à mon espace",
  },
  RENT_CAP: {
    preview: "Le loyer de votre bail dépasse le plafond légal",
    intro: (p) => [
      `Le logement situé ${p.address} est soumis à l'encadrement des loyers. Le loyer indiqué dépasse le loyer de référence majoré :`,
    ],
    button: "Accéder à mon espace",
  },
  DIAGNOSTICS: {
    preview: "Vos diagnostics : quelques points à régler",
    intro: (p) => [`Nous avons vérifié les diagnostics de votre bien situé ${p.address} :`],
    button: "Accéder à mon espace",
  },
};

export const RELANCE_OUTRO: Partial<Record<RelanceReason, string>> = {
  RENT_CAP:
    "Deux possibilités : ramener le loyer au plafond, ou justifier un complément de loyer (caractéristiques exceptionnelles du logement : vue, terrasse, prestations…). Répondez-nous en précisant votre choix et, le cas échéant, les éléments qui justifient le complément.",
  MISSING_ITEMS: "Vous pouvez nous les transmettre depuis votre espace client ou en répondant à ce message.",
  DIAGNOSTICS: "Répondez simplement à ce message, ou transmettez les documents depuis votre espace client.",
};


export const RELANCE_SUBJECTS: Record<RelanceReason, string> = {
  OWNER_FORM: "Votre dossier de bail notarié n'est pas terminé",
  TENANT_TO_ADD: "Votre bail notarié : indiquez-nous votre locataire",
  TENANT_FORM: "Votre formulaire locataire est en attente",
  TENANT_VIA_OWNER: "Votre locataire n'a pas encore rempli son formulaire",
  MISSING_ITEMS: "Votre bail notarié : éléments manquants",
  RENT_CAP: "Votre bail notarié : loyer au-dessus du plafond",
  DIAGNOSTICS: "Votre bail notarié : vos diagnostics",
};

/** Contenu de l'e-mail de relance, tel qu'il sera envoyé. */
export function relanceEmailContent(input: RelanceEmailInput) {
  const content = RELANCE_CONTENT[input.reason];
  return {
    subject: RELANCE_SUBJECTS[input.reason],
    preview: content.preview,
    greeting: `Bonjour${input.name ? ` ${input.name}` : ""},`,
    paragraphs: content.intro(input),
    items: input.items ?? [],
    outro: RELANCE_OUTRO[input.reason] ?? null,
    note: input.note?.trim() || null,
    button: content.button,
  };
}
