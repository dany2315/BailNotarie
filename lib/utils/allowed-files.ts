/**
 * Types de fichiers acceptés comme pièces (validés avec l'utilisateur le 17/11/2026) :
 * PDF, photos JPG / JPEG / PNG / HEIC (format des photos d'iPhone, HEIF compris), Word DOC / DOCX.
 * Contrôlé par le serveur à la demande d'envoi : le filtre du sélecteur de fichiers n'est qu'une aide.
 */
export const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic", "heif", "doc", "docx"] as const;

/** Valeur de l'attribut `accept` des sélecteurs de fichiers. */
export const ALLOWED_FILE_ACCEPT = ALLOWED_EXTENSIONS.map((ext) => "." + ext).join(",");

export const ALLOWED_FILE_MESSAGE = "Format non accepté : envoyez un PDF, une photo (JPG, PNG, HEIC) ou un document Word (DOC, DOCX).";

export function isAllowedFileName(fileName: unknown): boolean {
  if (typeof fileName !== "string") return false;
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return !!match && (ALLOWED_EXTENSIONS as readonly string[]).includes(match[1].toLowerCase());
}
