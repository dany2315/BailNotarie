import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "BailNotarie - Bail Notarié Simple et Sécurisé | Expert en Acte Authentique",
    template: "%s | BailNotarie"
  },
  description: "Créez votre bail notarié en 48h avec force exécutoire immédiate. +2000 clients satisfaits. Devis gratuit. Expert en acte authentique depuis 2019.",
  keywords: [
    "bail notarié",
    "acte authentique",
    "notaire location",
    "contrat bail notarié",
    "force exécutoire",
    "bail authentique",
    "location notariée",
    "sécuriser bail",
    "propriétaire bailleur",
    "expulsion rapide",
    "impayés loyer",
    "bail commercial notarié",
    "colocation notariée"
  ],
  appleWebApp: { capable: true, statusBarStyle: "default" }, // PWA iOS: barre blanche,
  generator: "Next.js",
  applicationName: "BailNotarie",
  creator: "DADtech",
  publisher: "BailNotarie",
  authors: [{ name: "BailNotarie", url: "https://bailnotarie.fr" }],
  category: "Business",
  classification: "Notarial Services",
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
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
  other: {
    "msapplication-TileColor": "#2563eb",
    "theme-color": "#ffffff",
  },
  icons: {
   icon:[
    {url: "/favicon.ico",type: "image/x-icon", sizes: "any"},
    {url: "/favicon-16x16.png",type: "image/png", sizes: "16x16"},
    {url: "/favicon-32x32.png",type: "image/png", sizes: "32x32"},
    {url: "/android-chrome-192x192.png",type: "image/png", sizes: "192x192"},
    {url: "/android-chrome-512x512.png",type: "image/png", sizes: "512x512"},

   ],
   apple: "/apple-touch-icon.png",
   shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://bailnotarie.fr",
    title: "BailNotarie - Bail Notarié Simple et Sécurisé | Expert en Acte Authentique",
    description: "Créez votre bail notarié en 48h avec force exécutoire immédiate. +2000 clients satisfaits. Devis gratuit. Expert en acte authentique depuis 2019.",
    siteName: "BailNotarie",
    images: [
      { 
        url: "https://bailnotarie.fr/og-image.png",
        width: 1200,
        height: 630,
        alt: "BailNotarie - Expert en bail notarié avec force exécutoire immédiate",
        type: "image/png",
      },
    ],
  },
  twitter: {  
    card: "summary_large_image",
    site: "@bailnotarie",
    creator: "@bailnotarie",
    title: "BailNotarie - Bail Notarié Simple et Sécurisé",
    description: "Créez votre bail notarié en 48h avec force exécutoire immédiate. +2000 clients satisfaits. Devis gratuit.",
    images: ["https://bailnotarie.fr/og-image.png"],
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // indispensable pour gérer les safe areas iOS
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
      </head>
      <body className={inter.className}>{children}
      
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'GA_MEASUREMENT_ID');
        `}
      </Script>
      
      {/* Schema.org JSON-LD */}
      <Script
        id="schema-org"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": "BailNotarie",
            "description": "Expert en création de baux notariés avec force exécutoire immédiate. Service professionnel pour propriétaires bailleurs.",
            "url": "https://bailnotarie.fr",
            "logo": "https://bailnotarie.fr/logoAvec.png",
            "image": "https://bailnotarie.fr/og-image.png",
            "telephone": "+33123456789",
            "email": "contact@bailnotarie.fr",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "FR",
              "addressLocality": "Paris"
            },
            "serviceType": "Notarial Services",
            "areaServed": {
              "@type": "Country",
              "name": "France"
            },
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Services de bail notarié",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Création de bail notarié",
                    "description": "Service complet de création de bail notarié avec force exécutoire immédiate"
                  }
                }
              ]
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "2000",
              "bestRating": "5",
              "worstRating": "1"
            },
            "review": [
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Marie Dubois"
                },
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5"
                },
                "reviewBody": "Excellent service ! Le processus était simple et rapide. Mon bail notarié m'a permis de récupérer rapidement les loyers impayés."
              }
            ]
          })
        }}
      />
      </body>
    </html>
  );
}