/**
 * Normalise l'URL de prévisualisation PDF en gardant les contrôles
 * natifs du viewer (zoom, navigation, défilement).
 */
export function getPdfPreviewUrl(url: string): string {
  if (!url) return url;

  // On évite de forcer un zoom "page-width" qui peut donner un rendu trop
  // agressif selon le viewer PDF du navigateur.
  // Ces options privilégient l'affichage des contrôles natifs.
  const viewerParams = "toolbar=1&navpanes=1&scrollbar=1&view=FitH";

  if (url.includes("#")) {
    const [base] = url.split("#");
    return `${base}#${viewerParams}`;
  }

  return `${url}#${viewerParams}`;
}
