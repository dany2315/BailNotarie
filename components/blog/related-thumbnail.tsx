"use client";

import { useState } from "react";
import Image from "next/image";

/** Visuel local servi si l'image distante ne repond pas. */
const FALLBACK_SRC = "/og-cover-v2.png";

interface RelatedThumbnailProps {
  src: string;
  className?: string;
}

/**
 * Vignette d'un lien contextuel.
 *
 * Les visuels des articles pointent vers Unsplash et Pexels, qui peuvent
 * retirer un cliche ou refuser la requete de l'optimiseur d'images. Sans
 * garde-fou, la carte affiche l'icone d'image cassee du navigateur. On bascule
 * donc sur un visuel local des la premiere erreur de chargement.
 */
export function RelatedThumbnail({ src, className }: RelatedThumbnailProps) {
  const [source, setSource] = useState(src);

  return (
    <Image
      src={source}
      alt=""
      width={60}
      height={60}
      className={className}
      onError={() => {
        if (source !== FALLBACK_SRC) setSource(FALLBACK_SRC);
      }}
    />
  );
}

export default RelatedThumbnail;
