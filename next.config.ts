import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/register",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/client/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/notaire/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/blog/page/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      // Pages de tunnel et espaces authentifies : jamais indexables.
      // Elles etaient auparavant absorbees par le canonical global "/" du layout
      // racine ; celui-ci ayant ete retire, elles doivent etre explicitement exclues.
      {
        source: "/commencer/deja-soumis",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/commencer/suivi",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/commencer/success",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/commencer/reminder",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/commencer/proprietaire/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/intakes/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/client/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/notaire/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/interface/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/blog/:slug(\\d+)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
    ];
  },
  images: {
    // --- Maitrise du quota d'optimisation d'images -------------------------
    // Chaque couple (image source, largeur, qualite, format) compte pour une
    // transformation facturee. Trois leviers la reduisent.

    // 1. Duree de cache. Par defaut Next la fixe a 60 secondes : passe ce
    //    delai, la meme image peut etre retransformee. Les visuels du site
    //    sont statiques et leur URL change quand leur contenu change, on peut
    //    donc les mettre en cache un an.
    minimumCacheTTL: 31536000,

    // 2. Largeurs generees. Les valeurs par defaut offrent 16 largeurs par
    //    image, soit jusqu'a 16 transformations chacune. La liste ci-dessous
    //    couvre les points de rupture reellement utilises par le site.
    //    deviceSizes sert aux images en pleine largeur ou en mode fill,
    //    imageSizes aux vignettes et logos declares avec une largeur fixe.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256, 384],

    // 3. Qualites autorisees. Sans cette liste, toute valeur de q generait une
    //    transformation supplementaire. Une seule qualite, donc une seule
    //    variante par largeur.
    qualities: [75],

    // Un seul format : ajouter avif doublerait le nombre de transformations
    // pour un gain de poids marginal face au webp.
    formats: ["image/webp"],

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
