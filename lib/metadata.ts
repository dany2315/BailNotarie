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
    default: "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée | Expert Notaire",
    template: "%s | BailNotarie",
  },
  description:
    "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale. +2000 clients satisfaits, devis gratuit.",
  keywords: [
    "bail notarié",
    "bail notaire",
    "bail",
    "bail location",
    "bail location notarié",
    "force exécutoire",
    "procédures simplifiées",
    "protection renforcée",
    "expulsion rapide",
    "impayés loyer",
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
    title: "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée",
    description:
      "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale.",
    images: [
      {
        url: "/og-cover-v2.png",
        width: 1200,
        height: 630,
        alt: "BailNotarie - Expert en bail notarié avec force exécutoire renforcée",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée",
    description:
      "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale.",
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
      "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée | Expert Notaire",
    description:
      "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale. +2000 clients satisfaits, devis gratuit.",
    keywords: [
      "bail notarié",
      "bail notaire",
      "bail",
      "bail location",
      "bail location notarié",
      "force exécutoire",
      "procédures simplifiées",
      "protection renforcée",
      "expulsion rapide",
      "impayés loyer",
      "acte authentique",
      "notaire bail",
    ],
    canonical: "/",                // ✅ pas de "#"
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },

  services: {
    title: "Services Bail Notarié - Force Exécutoire Renforcée | BailNotarie",
    description:
      "Découvrez nos services de bail notarié avec force exécutoire renforcée. Procédures simplifiées, protection juridique maximale, accompagnement par notaires certifiés.",
    keywords: [
      "services bail notarié",
      "création bail notarié",
      "accompagnement notaire",
      "force exécutoire renforcée",
      "procédures simplifiées",
      "protection juridique",
      "notaire certifié",
      "bail sécurisé",
    ],
    canonical: "/",                // ✅ section interne → canonical sur "/"
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },

  process: {
    title: "Processus Bail Notarié - Comment Créer Votre Bail | BailNotarie",
    description:
      "Découvrez notre processus simplifié pour créer votre bail notarié. Étapes claires, accompagnement expert, délais optimisés pour une protection maximale.",
    keywords: [
      "processus bail notarié",
      "comment créer bail notarié",
      "étapes bail notarié",
      "délai création bail",
      "processus simplifié",
      "accompagnement création",
      "procédure bail notaire",
    ],
    canonical: "/",                // ✅
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },

  faq: {
    title: "FAQ Bail Notarié - Questions Fréquentes | BailNotarie",
    description:
      "Trouvez les réponses à vos questions sur le bail notarié. Avantages, coûts, délais, sécurité juridique. Expert notaire à votre service.",
    keywords: [
      "faq bail notarié",
      "questions bail notarié",
      "avantages bail notarié",
      "coût bail notarié",
      "délai bail notarié",
      "sécurité bail notarié",
      "questions fréquentes",
    ],
    canonical: "/",                // ✅
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },

  contact: {
    title: "Contact BailNotarie - Devis Gratuit Bail Notarié | Expert Notaire",
    description:
      "Contactez nos experts pour un devis gratuit de bail notarié. Force exécutoire renforcée, procédures simplifiées. Réponse sous 24h.",
    keywords: [
      "contact bail notarié",
      "devis gratuit bail",
      "expert notaire",
      "conseil bail notarié",
      "devis personnalisé",
      "accompagnement juridique",
      "consultation gratuite",
    ],
    canonical: "/",                // ✅
    ogImage: "/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false,
  },

  blog: {
    title: "Blog Bail Notarié - Actualités et Conseils | BailNotarie",
    description:
      "Découvrez nos articles sur le bail notarié : actualités juridiques, conseils pratiques, nouvelles réglementations. Expert notaire à votre service.",
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
};

export default { generatePageMetadata, pageMetadata, defaultMetadata };
