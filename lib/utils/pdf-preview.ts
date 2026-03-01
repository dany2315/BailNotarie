/**
 * Normalise l'URL de prévisualisation PDF pour éviter un zoom excessif
 * dans l'iframe et ouvrir sur une vue adaptée à la largeur.
 */
export function getPdfPreviewUrl(url: string): string {
  if (!url) return url;

  const viewerParams = "view=FitH&zoom=page-width&pagemode=none";

  if (url.includes("#")) {
    const [base] = url.split("#");
    return `${base}#${viewerParams}`;
  }

  return `${url}#${viewerParams}`;
}
