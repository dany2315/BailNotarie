import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PriceSimulatorPage } from "@/components/price-simulator-page";

export const metadata: Metadata = {
  title: "Simulateur de prix du bail notarié",
  description:
    "Calculez le prix estimatif de votre bail notarié selon le loyer, le nombre de procurations et le nombre de personnes inscrites au bail.",
  alternates: {
    canonical: "/simulateur-prix-bail-notarie",
  },
};

export default function SimulateurPrixBailNotarie() {
  return (
    <>
      <Header />
      <PriceSimulatorPage />
      <Footer />
    </>
  );
}
