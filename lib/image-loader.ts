/**
 * Chargeur d'images personnalise (next.config.ts -> images.loader = "custom").
 *
 * Pourquoi : l'optimiseur d'images de Vercel est facture a la transformation et
 * le quota du plan Hobby est epuise. Chaque nouvelle taille demandee repondait
 * alors 402 Payment Required, ce qui affichait une icone d'image cassee — y
 * compris pour le visuel de repli, lui aussi servi par l'optimiseur.
 *
 * Ce chargeur supprime toute dependance a l'optimiseur :
 *  - les photos Unsplash sont redimensionnees par le CDN d'Unsplash lui-meme,
 *    qui accepte les parametres w et q, sans cout ni quota ;
 *  - les fichiers locaux sont servis tels quels depuis /public.
 *
 * Next.js continue de generer un srcset : le navigateur telecharge donc bien la
 * taille adaptee a son ecran, la transformation etant simplement faite en amont.
 */

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: ImageLoaderParams): string {
  // Fichiers locaux (/og-cover-v2.png, /logoLarge.png...) : servis tels quels.
  if (src.startsWith("/")) return src;

  try {
    const url = new URL(src);

    // Unsplash sert ses images via un CDN qui redimensionne a la volee.
    if (url.hostname === "images.unsplash.com") {
      // L'URL source porte un cadrage 1200x630. Si on ne fait varier que w, la
      // hauteur reste figee et le cadrage se deforme : on met donc h a l'echelle
      // pour conserver le rapport d'origine.
      const sourceWidth = Number(url.searchParams.get("w"));
      const sourceHeight = Number(url.searchParams.get("h"));
      if (sourceWidth > 0 && sourceHeight > 0) {
        url.searchParams.set("h", String(Math.round((width * sourceHeight) / sourceWidth)));
      }
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", String(quality ?? 75));
      url.searchParams.set("auto", "format");
      if (!url.searchParams.has("fit")) url.searchParams.set("fit", "crop");
      return url.toString();
    }

    // Pexels accepte egalement un parametre de largeur.
    if (url.hostname === "images.pexels.com") {
      url.searchParams.set("w", String(width));
      return url.toString();
    }

    return src;
  } catch {
    return src;
  }
}
