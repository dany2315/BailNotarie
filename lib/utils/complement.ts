/**
 * Demandes de complément (pièces et informations) : libellés et textes partagés par l'e-mail,
 * l'aperçu de l'équipe et l'espace client (mêmes mots partout). Fonctions pures.
 */

export const COMPLEMENT_REASONS = ["MISSING", "ILLEGIBLE", "EXPIRED", "WRONG_DOCUMENT", "INCOMPLETE", "WRONG_VALUE", "TO_CONFIRM"] as const;
export type ComplementReasonValue = (typeof COMPLEMENT_REASONS)[number];
export type ComplementItemKindValue = "DOCUMENT" | "FIELD";

/** Motifs qu'on choisit pour une pièce déjà reçue (une pièce absente est simplement « manquante »). */
export const REDO_REASONS: ComplementReasonValue[] = ["ILLEGIBLE", "EXPIRED", "WRONG_DOCUMENT", "INCOMPLETE"];

/** Motifs d'une information déjà renseignée (une information vide est simplement « manquante »). */
export const FIELD_REDO_REASONS: ComplementReasonValue[] = ["WRONG_VALUE", "TO_CONFIRM"];

/** Motif, en un mot (pastilles de l'équipe et du client). */
export const REASON_LABELS: Record<ComplementReasonValue, string> = {
  MISSING: "Manquante",
  ILLEGIBLE: "Illisible",
  EXPIRED: "Expirée",
  WRONG_DOCUMENT: "Mauvais document",
  INCOMPLETE: "Incomplète",
  WRONG_VALUE: "À corriger",
  TO_CONFIRM: "À confirmer",
};

/** Motif expliqué au client, en une phrase simple. */
export const REASON_SENTENCES: Record<ComplementReasonValue, string> = {
  MISSING: "Nous ne l'avons pas encore reçue.",
  ILLEGIBLE: "Le fichier reçu est illisible.",
  EXPIRED: "La pièce reçue n'est plus valable.",
  WRONG_DOCUMENT: "Le fichier reçu ne correspond pas à cette pièce.",
  INCOMPLETE: "Il manque une partie du document (pages, recto ou verso).",
  WRONG_VALUE: "L'information indiquée semble inexacte : merci de la corriger.",
  TO_CONFIRM: "Merci de vérifier cette information et de la confirmer.",
};

/** Motif expliqué au client : une information n'est pas « reçue » comme une pièce. */
export function reasonSentence(reason: ComplementReasonValue, kind: ComplementItemKindValue = "DOCUMENT") {
  if (kind === "FIELD" && reason === "MISSING") return "Cette information manque dans votre dossier.";
  return REASON_SENTENCES[reason];
}

/** Message proposé par défaut, modifiable par l'équipe dans l'aperçu. */
export const DEFAULT_COMPLEMENT_MESSAGE =
  "Pour finaliser votre dossier de bail notarié, nous avons besoin des pièces ci-dessous. Vous pouvez les envoyer en quelques minutes depuis votre espace.";

/** Message par défaut quand la demande contient des informations à compléter. */
export const DEFAULT_COMPLEMENT_FIELDS_MESSAGE =
  "Pour finaliser votre dossier de bail notarié, nous avons besoin des éléments ci-dessous. Vous pouvez les compléter en quelques minutes depuis votre espace.";

export function defaultComplementMessage(hasFields: boolean) {
  return hasFields ? DEFAULT_COMPLEMENT_FIELDS_MESSAGE : DEFAULT_COMPLEMENT_MESSAGE;
}

/**
 * Message des relances et des pièces redemandées : il reste juste quel que soit le nombre de pièces
 * encore attendues (le message du premier envoi, lui, peut ne plus l'être).
 */
export const REMINDER_COMPLEMENT_MESSAGE =
  "Il nous manque encore les pièces ci-dessous pour finaliser votre dossier de bail notarié. Vous pouvez les envoyer en quelques minutes depuis votre espace.";

export const REMINDER_COMPLEMENT_FIELDS_MESSAGE =
  "Il nous manque encore les éléments ci-dessous pour finaliser votre dossier de bail notarié. Vous pouvez les compléter en quelques minutes depuis votre espace.";

/** « 2 pièces et 1 information », « 3 informations », « 1 pièce ». */
export function complementCountLabel(items: Array<{ kind?: ComplementItemKindValue | string | null }>) {
  const fields = items.filter((item) => item.kind === "FIELD").length;
  const pieces = items.length - fields;
  const parts = [
    pieces > 0 ? `${pieces} pièce${pieces > 1 ? "s" : ""}` : null,
    fields > 0 ? `${fields} information${fields > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  return parts.join(" et ") || "0 pièce";
}

export const COMPLEMENT_MESSAGE_MAX = 1500;
export const COMPLEMENT_NOTE_MAX = 500;

export interface ComplementEmailItem {
  label: string;
  reason: ComplementReasonValue;
  note?: string | null;
  /** Pièce (par défaut) ou information. */
  kind?: ComplementItemKindValue;
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
  const hasFields = input.items.some((item) => item.kind === "FIELD");
  const what = complementCountLabel(input.items);
  const verb = hasFields ? "à compléter" : "à nous envoyer";
  return {
    subject: input.reminder ? `Rappel : ${what} ${verb} pour votre bail notarié` : `Votre bail notarié : ${what} ${verb}`,
    preview: input.reminder ? `Il nous manque encore ${what} pour votre dossier` : `Nous avons besoin de ${what} pour votre dossier`,
    greeting: `Bonjour${input.name ? ` ${input.name}` : ""},`,
    context: `Dossier : ${input.address}`,
    message:
      (input.message ?? "").trim() ||
      (input.reminder ? (hasFields ? REMINDER_COMPLEMENT_FIELDS_MESSAGE : REMINDER_COMPLEMENT_MESSAGE) : defaultComplementMessage(hasFields)),
    items: input.items.map((item) => ({
      label: item.label,
      reason: REASON_LABELS[item.reason],
      detail: [reasonSentence(item.reason, item.kind), item.note?.trim()].filter(Boolean).join(" "),
    })),
    button: hasFields ? "Compléter mon dossier" : count > 1 ? "Envoyer mes pièces" : "Envoyer ma pièce",
    outro: "Vous pouvez aussi répondre à cet e-mail si vous avez une question.",
  };
}

/** Lien de la demande : il ouvre la bonne page de l'espace, après connexion si besoin. */
export function complementRequestPath(requestId: string) {
  return `/client/demande/${requestId}`;
}

type TargetIds = { personId?: string | null; entrepriseId?: string | null; clientId?: string | null; propertyId?: string | null; bailId?: string | null };

/** Clé d'une pièce attendue : type + rattachement (la même dans la fiche et dans la fenêtre de demande). */
export function complementKey(kind: string, target: TargetIds) {
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

/** Clé d'une information : question + rattachement. */
export function fieldComplementKey(question: string, target: TargetIds) {
  return complementKey(`field:${question}`, target);
}

/** Clé d'une ligne de demande, pièce ou information. */
export function complementItemKey(item: TargetIds & { kind?: string | null; documentKind?: string | null; fieldKey?: string | null }) {
  return item.kind === "FIELD" ? fieldComplementKey(item.fieldKey ?? "", item) : complementKey(item.documentKind ?? "", item);
}
