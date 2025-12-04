import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { StructuredData } from "@/components/seo/structured-data";
import { Toaster } from "@/components/shared/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bailnotarie.fr"),
  title: {
    default: "BailNotarie - Procédure de bail notarié en ligne, avec force exécutoire immédiate",
    template: "%s | BailNotarie"
  },
  description: "Créez votre bail notarié en ligne, en 48h avec force exécutoire immédiate. +200 clients satisfaits. Devis gratuit. Expert en acte authentique depuis 2019.",
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
  authors: [{ name: "BailNotarie", url: "https://www.bailnotarie.fr" }],
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
    canonical: "https://www.bailnotarie.fr",
    languages: {
      'fr-FR': 'https://www.bailnotarie.fr',
    },
  },
  verification: {
    google: "google-site-verification=x_2ORStLKvXGVFbuibksag2S99sccQgdX387oacodLs",
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
    url: "https://www.bailnotarie.fr",
    siteName: "BailNotarie",
    title: "BailNotarie - Bail Notarié en ligne, en 48h avec force exécutoire immédiate",
    description: "Créez votre bail notarié en ligne, en 48h avec force exécutoire immédiate. +200 clients satisfaits. Devis gratuit. Expert en acte authentique depuis 2019.",
    images: [
      { 
        url: "https://www.bailnotarie.fr/og-cover-v2.png",
        width: 1200,
        height: 630,
        alt: "BailNotarie - Expert en bail notarié avec force exécutoire immédiate",
      },
    ],
  },
  twitter: {  
    card: "summary_large_image",
    title: "BailNotarie - Bail Notarié en ligne, en 48h avec force exécutoire immédiate",
    description: "Créez votre bail notarié en ligne, en 48h avec force exécutoire immédiate. +2000 clients satisfaits. Devis gratuit.",
    site: "@bailnotarie",
    creator: "@bailnotarie",
    images: ["https://www.bailnotarie.fr/og-cover-v2.png"],
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
  const isProd = process.env.VERCEL_ENV === "production";
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;


  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        {isProd && GTM_ID && (
          <Script
            id="gtm-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `,
            }}
          />
        )}
      </head>
      <body className={inter.className}>{children}
      
      {/* Google GTM */}
      {isProd && GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
      
      {/* Données structurées SEO optimisées */}
      <StructuredData />
      {/* Toaster pour les notifications */}
      <Toaster />
      </body>
    </html>
  );
}