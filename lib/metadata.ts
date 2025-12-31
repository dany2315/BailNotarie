import type { Metadata } from 'next';

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  /** chemin relatif (ex: "/", "/blog") — jamais de "#..." */
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL("https://www.bailnotarie.fr"),
  title: {
    default: "BailNotarie - Constituer votre dossier de bail notarié 100% en ligne",
    template: "%s | BailNotarie",
  },
  description:
    "Constituer votre dossier de bail notarié 100% en ligne. +200 clients satisfaits.Service dédié aux propriétaires bailleurs pour sécuriser leur bail d'habitation en France.",
  keywords: [
    "bail notarié",
    "bail notarié en ligne",
    "bail notarié France",
    "bail notarié en 48h",
    "bail location notarié",
    "notaire bail habitation",
    "contrat de location notarié",
    "bail",
    "bail location",
    "contrat location",
    "bail location notarié",
    "force exécutoire",
    "procédures simplifiées",
    "protection juridique",
    "acte authentique",
    "notaire bail",
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/", // ✅ canonical globale
    languages: {
      "fr-FR": "/",
      "x-default": "/",
    },
  },
  verification: {
    // ✅ uniquement le token
    google: "x_2ORStLKvXGVFbuibksag2S99sccQgdX387oacodLs",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/", // ✅ aligne avec canonical
    siteName: "BailNotarie",
    title: "BailNotarie - Constituer votre dossier de bail notarié 100% en ligne",
    description:
      "Constituer votre dossier de bail notarié 100% en ligne. +200 clients satisfaits.Service dédié aux propriétaires bailleurs pour sécuriser leur bail d'habitation en France.",
    images: [
      {
        url: "/og-cover-v2.png",
        width: 1200,
        height: 630,
        alt: "BailNotarie - Constituer votre dossier de bail notarié 100% en ligne",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BailNotarie - Procédure de bail notarié 100% en ligne, avec force exécutoire immédiate",
    description:
      "Constituer votre dossier de bail notarié 100% en ligne. +200 clients satisfaits.Service dédié aux propriétaires bailleurs pour sécuriser leur bail d'habitation en France.",
    site: "@bailnotarie",
    creator: "@bailnotarie",
    images: ["/og-cover-v2.png"],
  },
};

// utilitaire
const stripHash = (path: string) => path.split("#")[0] || "/";

export function generatePageMetadata(pageData: PageMetadata): Metadata {
  // canonical propre, sans fragment
  const canonicalClean = stripHash(pageData.canonical ?? "/");
  const ogImage = pageData.ogImage || "/og-cover-v2.png";

  return {
    title: pageData.title,
    description: pageData.description,
    keywords: pageData.keywords,
    robots: pageData.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          nocache: false,
          googleBot: {
            index: true,
            follow: true,
            noimageindex: false,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    alternates: {
      canonical: canonicalClean, // ✅ relative + sans #
      languages: {
        "fr-FR": canonicalClean,
        "x-default": canonicalClean,
      },
    },
    verification: {
      google: "x_2ORStLKvXGVFbuibksag2S99sccQgdX387oacodLs",
    },
    icons: defaultMetadata.icons,
    openGraph: {
      type: pageData.ogType || "website",
      locale: "fr_FR",
      url: canonicalClean,          // ✅ OG url = canonical
      siteName: "BailNotarie",
      title: pageData.title,
      description: pageData.description,
      images: [
        {
          url: ogImage.startsWith("http") ? ogImage : ogImage, // relatif OK avec metadataBase
          width: 1200,
          height: 630,
          alt: pageData.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageData.title,
      description: pageData.description,
      site: "@bailnotarie",
      creator: "@bailnotarie",
      images: [ogImage],
    },
  };
}

// Exemples pages — mets des canonicals SANS #
export const pageMetadata = {
  home: {
    title:
      "BailNotarie - Constituer votre dossier de bail notarié 100% en ligne",
    description:
      "Procédure de bail notarié 100% en ligne. +200 clients satisfaits.Service dédié aux propriétaires bailleurs pour sécuriser leur bail d'habitation en France.",
    keywords: [
      "bail notarié",
      "bail notarié en ligne",
      "bail notarié France",
      "bail notarié en 48h",
      "bail location notarié",
      "notaire bail habitation",
      "contrat de location notarié",
      "bail",
      "bail location",
      "bail location notarié",
      "force exécutoire",
      "procédures simplifiées",
      "protection juridique",
      "acte authentique",
    ],
    canonical: "/",                // ✅ pas de "#"
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },


  blog: {
    title: "Blog Bail Notarié - Actualités et Conseils - BailNotarie",
    description:
      "Découvrez nos articles sur le bail notarié : actualités juridiques, conseils pratiques, nouvelles réglementations. Service dédié aux propriétaires bailleurs pour sécuriser leur bail d'habitation en France.",
    keywords: [
      "blog bail notarié",
      "actualités bail notarié",
      "conseils bail notarié",
      "réglementation bail",
      "loi bail notarié",
      "articles juridiques",
      "expertise notariale",
    ],
    canonical: "/blog",            // ✅ page distincte
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },

  notFound: {
    title: "Page Introuvable - BailNotarie",
    description:
      "La page que vous recherchez n'existe pas. Retrouvez nos services de bail notarié avec force exécutoire renforcée.",
    keywords: ["page introuvable", "erreur 404", "bail notarié", "services notaire"],
    canonical: "/404",
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: true,
  },
  creerBailNotarié: {
    title: "Effectuer votre procédure de bail notarié en ligne, avec force exécutoire immédiate - BailNotarie",
    description:
      "Procédure de bail notarié en ligne, avec force exécutoire immédiate. +200 clients satisfaits.Service dédié aux propriétaires bailleurs pour sécuriser leur bail d'habitation en France.",
    keywords: [
      "créer un bail notarié en ligne",
      "créer un bail notarié en 48h",
      "bail notarié en ligne",
      "bail notarié en 48h",
      "bail location notarié",
      "notaire bail habitation",
      "contrat de location notarié",
      "bail",
      "bail location",
      "bail location notarié",
    ],
    canonical: "/commencer",
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },

};

export default { generatePageMetadata, pageMetadata, defaultMetadata };
