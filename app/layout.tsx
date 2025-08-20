import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BailNotarie - Bail notarié simple et sécurisé",
  description: "Formalisez votre colocation avec un notaire en toute confiance. Bail notarié authentique, incontestable et exécutoire immédiatement.",
  keywords: "bail notarié, notaire, colocation, location, contrat authentique, force exécutoire",
  appleWebApp: { capable: true, statusBarStyle: "default" }, // PWA iOS: barre blanche
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