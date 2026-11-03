import { documentKindLabels } from "@/lib/utils/document-labels";

/**
 * Nom de fichier lisible d'une pièce au téléchargement :
 * « Titre de propriété - Jean Dupont - 10 rue de la Convention - a1b2c3.pdf ».
 *
 * Le nom stocké sur S3 (fileKey) ne change pas : on ne fixe que le nom proposé au navigateur.
 * Les 6 derniers caractères de l'identifiant de la pièce terminent le nom, pour garder des noms
 * distincts et retrouver la pièce en base (`id LIKE '%a1b2c3'`).
 */

export const DOCUMENT_SHORT_ID_LENGTH = 6;

const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/zip": "zip",
};

const EXTENSION_PATTERN = /\.([A-Za-z0-9]{1,5})$/;

export interface DocumentFileNameParts {
  id: string;
  kind?: string | null;
  /** Nom du fichier envoyé (sert de libellé pour les pièces sans type précis). */
  label?: string | null;
  fileKey?: string | null;
  mimeType?: string | null;
  /** Personne, entreprise ou propriétaire concerné. */
  owner?: string | null;
  /** Adresse du bien concerné. */
  address?: string | null;
}

/** Retire les caractères interdits dans un nom de fichier (Windows, macOS) et les espaces superflus. */
function cleanSegment(value: string | null | undefined, maxLength: number): string {
  if (!value) return "";
  const cleaned = value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).replace(/[\s,.;-]+$/, "").trim();
}

function stripExtension(name: string): string {
  return name.replace(EXTENSION_PATTERN, "");
}

/** Extension tirée de la clé de stockage, sinon du nom envoyé, sinon du type MIME. */
export function documentFileExtension(parts: Pick<DocumentFileNameParts, "fileKey" | "label" | "mimeType">): string {
  for (const name of [parts.fileKey, parts.label]) {
    const match = name?.split(/[/?#]/).filter(Boolean).pop()?.match(EXTENSION_PATTERN);
    if (match) return match[1].toLowerCase();
  }
  const mime = parts.mimeType?.toLowerCase().split(";")[0].trim();
  return (mime && MIME_EXTENSIONS[mime]) || "";
}

/** Rue du bien : la première partie de l'adresse, sans le code postal ni la ville. */
export function shortAddress(fullAddress: string | null | undefined): string {
  if (!fullAddress) return "";
  return fullAddress.split(",")[0]?.trim() ?? "";
}

export function buildDocumentFileName(parts: DocumentFileNameParts): string {
  const kindLabel = parts.kind ? documentKindLabels[parts.kind] : undefined;
  const type = cleanSegment(kindLabel || (parts.label ? stripExtension(parts.label) : "") || "Document", 60) || "Document";
  const owner = cleanSegment(parts.owner, 40);
  const address = cleanSegment(parts.address, 50);
  const shortId = cleanSegment(parts.id.slice(-DOCUMENT_SHORT_ID_LENGTH), DOCUMENT_SHORT_ID_LENGTH);
  const extension = documentFileExtension(parts);

  // Pas de doublon si le nom du propriétaire ou l'adresse figure déjà dans le libellé.
  const segments = [type];
  for (const segment of [owner, address]) {
    if (segment && !segments.some((existing) => existing.toLowerCase().includes(segment.toLowerCase()))) {
      segments.push(segment);
    }
  }
  if (shortId) segments.push(shortId);

  return extension ? `${segments.join(" - ")}.${extension}` : segments.join(" - ");
}

/** Variante ASCII du nom, pour les clients qui ignorent `filename*`. */
function asciiFileName(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
}

/** Encodage RFC 5987 (`filename*=UTF-8''…`). */
function rfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** En-tête Content-Disposition avec le nom en ASCII et en UTF-8 (accents, apostrophes). */
export function contentDisposition(fileName: string, type: "inline" | "attachment" = "attachment"): string {
  return `${type}; filename="${asciiFileName(fileName)}"; filename*=UTF-8''${rfc5987(fileName)}`;
}
