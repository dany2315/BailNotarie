"use client";

import { useState } from "react";
import Image from "next/image";

/** Visuel local servi si la source ne repond pas. */
const FALLBACK_SRC = "/og-cover-v2.png";

type ArticleImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
} & ({ fill: true; width?: never; height?: never } | { fill?: false; width: number; height: number });

/**
 * Image d'article tolerante aux sources indisponibles.
 *
 * Les visuels d'articles peuvent venir d'une banque externe (Unsplash, Pexels),
 * qui peut retirer un cliche ou refuser la requete de l'optimiseur d'images.
 * Sans garde-fou, la page affiche l'icone d'image cassee du navigateur. On
 * bascule ici sur un visuel local des la premiere erreur de chargement, ce qui
 * rend le choix de la source sans consequence sur le rendu.
 */
export function ArticleImage({ src, alt, className, priority, sizes, fill, width, height }: ArticleImageProps) {
  const [source, setSource] = useState(src);
  const onError = () => {
    if (source !== FALLBACK_SRC) setSource(FALLBACK_SRC);
  };

  if (fill) {
    return (
      <Image
        src={source}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={source}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={onError}
    />
  );
}

export default ArticleImage;
