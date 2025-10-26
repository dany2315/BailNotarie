import { Metadata } from 'next';

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

export const defaultMetadata: Metadata = {
  title: {
    default: "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée | Expert Notaire",
    template: "%s | BailNotarie"
  },
  description: "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale. +2000 clients satisfaits, devis gratuit.",
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
    "notaire bail"
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
    canonical: "https://bailnotarie.fr",
    languages: {
      'fr-FR': 'https://bailnotarie.fr',
    },
  },
  verification: {
    google: "google-site-verification=x_2ORStLKvXGVFbuibksag2S99sccQgdX387oacodLs",
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
    url: "https://bailnotarie.fr",
    siteName: "BailNotarie",
    title: "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée",
    description: "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale.",
    images: [
      {
        url: "https://bailnotarie.fr/og-cover-v2.png",
        width: 1200,
        height: 630,
        alt: "BailNotarie - Expert en bail notarié avec force exécutoire renforcée",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée",
    description: "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale.",
    site: "@bailnotarie",
    creator: "@bailnotarie",
    images: ["https://bailnotarie.fr/og-cover-v2.png"],
  },
};

export function generatePageMetadata(pageData: PageMetadata): Metadata {
  const baseUrl = "https://bailnotarie.fr";
  const canonicalUrl = pageData.canonical ? `${baseUrl}${pageData.canonical}` : baseUrl;
  const ogImage = pageData.ogImage || "https://bailnotarie.fr/og-cover-v2.png";

  return {
    title: pageData.title,
    description: pageData.description,
    keywords: pageData.keywords,
    robots: pageData.noIndex ? {
      index: false,
      follow: false,
    } : {
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
      canonical: canonicalUrl,
      languages: {
        'fr-FR': canonicalUrl,
      },
    },
    verification: {
      google: "google-site-verification=x_2ORStLKvXGVFbuibksag2S99sccQgdX387oacodLs",
    },
    icons: defaultMetadata.icons,
    openGraph: {
      type: pageData.ogType || "website",
      locale: "fr_FR",
      url: canonicalUrl,
      siteName: "BailNotarie",
      title: pageData.title,
      description: pageData.description,
      images: [
        {
          url: ogImage,
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

// Métadonnées spécifiques par page
export const pageMetadata = {
  home: {
    title: "BailNotarie - Bail Notarié avec Force Exécutoire Renforcée | Expert Notaire",
    description: "Profitez des nouveaux avantages du bail notarié : force exécutoire immédiate, procédures simplifiées, protection maximale. +2000 clients satisfaits, devis gratuit.",
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
      "notaire bail"
    ],
    canonical: "/",
    ogImage: "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false
  },
  
  services: {
    title: "Services Bail Notarié - Force Exécutoire Renforcée | BailNotarie",
    description: "Découvrez nos services de bail notarié avec force exécutoire renforcée. Procédures simplifiées, protection juridique maximale, accompagnement par notaires certifiés.",
    keywords: [
      "services bail notarié",
      "création bail notarié",
      "accompagnement notaire",
      "force exécutoire renforcée",
      "procédures simplifiées",
      "protection juridique",
      "notaire certifié",
      "bail sécurisé"
    ],
    canonical: "/#services",
    ogImage: "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false
  },

  process: {
    title: "Processus Bail Notarié - Comment Créer Votre Bail | BailNotarie",
    description: "Découvrez notre processus simplifié pour créer votre bail notarié. Étapes claires, accompagnement expert, délais optimisés pour une protection maximale.",
    keywords: [
      "processus bail notarié",
      "comment créer bail notarié",
      "étapes bail notarié",
      "délai création bail",
      "processus simplifié",
      "accompagnement création",
      "procédure bail notaire"
    ],
    canonical: "/#process",
    ogImage: "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false
  },

  faq: {
    title: "FAQ Bail Notarié - Questions Fréquentes | BailNotarie",
    description: "Trouvez les réponses à vos questions sur le bail notarié. Avantages, coûts, délais, sécurité juridique. Expert notaire à votre service.",
    keywords: [
      "faq bail notarié",
      "questions bail notarié",
      "avantages bail notarié",
      "coût bail notarié",
      "délai bail notarié",
      "sécurité bail notarié",
      "questions fréquentes"
    ],
    canonical: "/#faq",
    ogImage: "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false
  },

  contact: {
    title: "Contact BailNotarie - Devis Gratuit Bail Notarié | Expert Notaire",
    description: "Contactez nos experts pour un devis gratuit de bail notarié. Force exécutoire renforcée, procédures simplifiées. Réponse sous 24h.",
    keywords: [
      "contact bail notarié",
      "devis gratuit bail",
      "expert notaire",
      "conseil bail notarié",
      "devis personnalisé",
      "accompagnement juridique",
      "consultation gratuite"
    ],
    canonical: "/#contact",
    ogImage: "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false
  },

  blog: {
    title: "Blog Bail Notarié - Actualités et Conseils | BailNotarie",
    description: "Découvrez nos articles sur le bail notarié : actualités juridiques, conseils pratiques, nouvelles réglementations. Expert notaire à votre service.",
    keywords: [
      "blog bail notarié",
      "actualités bail notarié",
      "conseils bail notarié",
      "réglementation bail",
      "loi bail notarié",
      "articles juridiques",
      "expertise notariale"
    ],
    canonical: "/blog",
    ogImage: "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: false
  },

  notFound: {
    title: "Page Introuvable - BailNotarie",
    description: "La page que vous recherchez n'existe pas. Retrouvez nos services de bail notarié avec force exécutoire renforcée.",
    keywords: [
      "page introuvable",
      "erreur 404",
      "bail notarié",
      "services notaire"
    ],
    canonical: "/404",
    ogImage: "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "website" as const,
    noIndex: true
  }
};

export default { generatePageMetadata, pageMetadata, defaultMetadata };
