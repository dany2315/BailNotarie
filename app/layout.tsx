import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BailNotarie - Bail notarié simple et sécurisé",
  description: "Formalisez votre location avec un notaire en toute confiance. Bail notarié authentique, incontestable et exécutoire immédiatement.",
  keywords: "bail notarié, notaire, location, contrat authentique, force exécutoire",
  appleWebApp: { capable: true, statusBarStyle: "default" }, // PWA iOS: barre blanche,
  generator: "Next.js",
  applicationName: "BailNotarie",
  creator: "DADtech",
  publisher: "BailNotarie",
  authors: [{ name: "BailNotarie", url: "https://bailnotarie.fr" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
    url: "https://bailnotarie.fr",
    title: "BailNotarie - Bail notarié simple et sécurisé",
    description: "Formalisez votre location avec un notaire en toute confiance. Bail notarié authentique, incontestable et exécutoire immédiatement.",
    siteName: "BailNotarie",
    images: [
      { 
        url: "https://bailnotarie.fr/og-image.png",
        width: 1200,
        height: 630,
        alt: "BailNotarie - Bail notarié simple et sécurisé",
      },
    ],
  },
  twitter: {  
    card: "summary_large_image",
    title: "BailNotarie - Bail notarié simple et sécurisé",
    description: "Formalisez votre location avec un notaire en toute confiance. Bail notarié authentique, incontestable et exécutoire immédiatement.",
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
      <body className={inter.className}>{children}</body>
    </html>
  );
}