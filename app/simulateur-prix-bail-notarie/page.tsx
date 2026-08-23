import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PriceSimulatorPage } from "@/components/price-simulator-page";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";

const pageTitle = "Simulateur prix bail notarié : coût et tarif estimés";
const pageDescription =
  "Estimez le prix d'un bail notarié d'habitation selon le loyer hors charges, les procurations et la TVA. Simulation claire du coût TTC avant de constituer votre dossier.";
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
        alt: "Simulateur de prix du bail notarié BailNotarie",
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
      "prix bail notarié",
      "coût bail notarié",
      "tarif bail notarié",
      "bail notarié d'habitation",
    ],
  };

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Accueil", path: "/" },
          { name: "Simulateur prix bail notarié" },
        ]}
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
