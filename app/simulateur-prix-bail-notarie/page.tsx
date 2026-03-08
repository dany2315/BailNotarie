import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PriceSimulatorPage } from "@/components/price-simulator-page";

const pageTitle = "Simulateur prix bail notarie : cout et tarif estimes";
const pageDescription =
  "Estimez le prix d'un bail notarie d'habitation selon le loyer hors charges, les procurations et la TVA. Simulation claire du cout TTC avant de constituer votre dossier.";
const pageUrl = "https://www.bailnotarie.fr/simulateur-prix-bail-notarie";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/simulateur-prix-bail-notarie",
  },
  openGraph: {
    type: "website",
    url: pageUrl,
    title: pageTitle,
    description: pageDescription,
    images: [
      {
        url: "/og-cover-v2.png",
        width: 1200,
        height: 630,
        alt: "Simulateur de prix du bail notarie BailNotarie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/og-cover-v2.png"],
  },
};

export default function SimulateurPrixBailNotarie() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://www.bailnotarie.fr/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Simulateur prix bail notarie",
        item: pageUrl,
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": pageUrl,
    url: pageUrl,
    name: pageTitle,
    description: pageDescription,
    inLanguage: "fr-FR",
    isPartOf: {
      "@type": "WebSite",
      name: "BailNotarie",
      url: "https://www.bailnotarie.fr/",
    },
    about: [
      "prix bail notarie",
      "cout bail notarie",
      "tarif bail notarie",
      "bail notarie d'habitation",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Header />
      <PriceSimulatorPage />
      <Footer />
    </>
  );
}
