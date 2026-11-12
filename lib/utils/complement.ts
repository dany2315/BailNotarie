/**
 * Demandes de pièces : libellés et textes partagés par l'e-mail, l'aperçu de l'équipe et
 * l'espace client (mêmes mots partout). Fonctions pures.
 */

export const COMPLEMENT_REASONS = ["MISSING", "ILLEGIBLE", "EXPIRED", "WRONG_DOCUMENT", "INCOMPLETE"] as const;
export type ComplementReasonValue = (typeof COMPLEMENT_REASONS)[number];

/** Motifs qu'on choisit pour une pièce déjà reçue (une pièce absente est simplement « manquante »). */
export const REDO_REASONS: ComplementReasonValue[] = ["ILLEGIBLE", "EXPIRED", "WRONG_DOCUMENT", "INCOMPLETE"];

/** Motif, en un mot (pastilles de l'équipe et du client). */
export const REASON_LABELS: Record<ComplementReasonValue, string> = {
  MISSING: "Manquante",
  ILLEGIBLE: "Illisible",
  EXPIRED: "Expirée",
  WRONG_DOCUMENT: "Mauvais document",
  INCOMPLETE: "Incomplète",
};

/** Motif expliqué au client, en une phrase simple. */
export const REASON_SENTENCES: Record<ComplementReasonValue, string> = {
  MISSING: "Nous ne l'avons pas encore reçue.",
  ILLEGIBLE: "Le fichier reçu est illisible.",
  EXPIRED: "La pièce reçue n'est plus valable.",
  WRONG_DOCUMENT: "Le fichier reçu ne correspond pas à cette pièce.",
  INCOMPLETE: "Il manque une partie du document (pages, recto ou verso).",
};

/** Message proposé par défaut, modifiable par l'équipe dans l'aperçu. */
export const DEFAULT_COMPLEMENT_MESSAGE =
  "Pour finaliser votre dossier de bail notarié, nous avons besoin des pièces ci-dessous. Vous pouvez les envoyer en quelques minutes depuis votre espace.";

export const COMPLEMENT_MESSAGE_MAX = 1500;
export const COMPLEMENT_NOTE_MAX = 500;

export interface ComplementEmailItem {
  label: string;
  reason: ComplementReasonValue;
  note?: string | null;
}

export interface ComplementEmailInput {
  name: string;
  address: string;
  message?: string | null;
  items: ComplementEmailItem[];
  /** Relance : la demande a déjà été envoyée au moins une fois. */
  reminder?: boolean;
}

/** Contenu de l'e-mail, utilisé tel quel par le modèle d'e-mail et par l'aperçu de l'équipe. */
export function complementEmailContent(input: ComplementEmailInput) {
  const count = input.items.length;
  const pieces = count > 1 ? `${count} pièces` : "1 pièce";
  return {
    subject: input.reminder ? `Rappel : ${pieces} à nous envoyer pour votre bail notarié` : `Votre bail notarié : ${pieces} à nous envoyer`,
    preview: input.reminder ? `Il nous manque encore ${pieces} pour votre dossier` : `Nous avons besoin de ${pieces} pour votre dossier`,
    greeting: `Bonjour${input.name ? ` ${input.name}` : ""},`,
    context: `Dossier : ${input.address}`,
    message: (input.message ?? "").trim() || DEFAULT_COMPLEMENT_MESSAGE,
    items: input.items.map((item) => ({
      label: item.label,
      reason: REASON_LABELS[item.reason],
      detail: [REASON_SENTENCES[item.reason], item.note?.trim()].filter(Boolean).join(" "),
    })),
    button: count > 1 ? "Envoyer mes pièces" : "Envoyer ma pièce",
    outro: "Vous pouvez aussi répondre à cet e-mail si vous avez une question.",
  };
}

/** Lien de la demande : il ouvre la bonne page de l'espace, après connexion si besoin. */
export function complementRequestPath(requestId: string) {
  return `/client/demande/${requestId}`;
}

/** Clé d'une pièce attendue : type + rattachement (la même dans la fiche et dans la fenêtre de demande). */
export function complementKey(
  kind: string,
  target: { personId?: string | null; entrepriseId?: string | null; clientId?: string | null; propertyId?: string | null; bailId?: string | null },
) {
  const [field, id] = target.personId
    ? ["person", target.personId]
    : target.entrepriseId
      ? ["entreprise", target.entrepriseId]
      : target.clientId
        ? ["client", target.clientId]
        : target.propertyId
          ? ["property", target.propertyId]
          : ["bail", target.bailId ?? ""];
  return `${kind}:${field}:${id}`;
}
