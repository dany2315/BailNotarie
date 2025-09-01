import type { Metadata } from "next";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { PresentationSection } from "@/components/presentation-section";
import { ProcessSection } from "@/components/process-section"
import { StatsSection } from "@/components/stats-section";
import { BenefitsSection } from "@/components/benefits-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { CTASection } from "@/components/cta-section";
import { ContactForm } from "@/components/contact-form";
import { FAQSection } from "@/components/faq-section";
import { Footer } from "@/components/footer";


export const metadata: Metadata = {
  title: "BailNotarie - créez votre bail notarié simple et sécurisé",
  description: "Créez votre bail notarié en 48h avec BailNotarie. Force exécutoire immédiate, +2000 clients satisfaits, devis gratuit. Expert depuis 2019.",
  keywords: [
    "bail notarié",
    "acte authentique",
    "force exécutoire",
    "propriétaire bailleur",
    "location sécurisée",
    "notaire bail",
    "expulsion rapide",
    "impayés loyer"
  ],
  openGraph: {
    title: "BailNotarie - créez votre bail notarié simple et sécurisé",
    description: "Créez votre bail notarié en 48h avec force exécutoire immédiate. +2000 clients satisfaits, devis gratuit.",
    url: "https://bailnotarie.fr",
    images: [
      {
        url: "https://bailnotarie.fr/og-cover-v2.png",
        width: 1200,
        height: 630,
        alt: "BailNotarie - Expert en bail notarié"
      }
    ]
  },  
  twitter: {
    card: "summary_large_image",
    title: "BailNotarie - créez votre bail notarié simple et sécurisé",
    description: "Créez votre bail notarié en 48h avec force exécutoire immédiate. +2000 clients satisfaits, devis gratuit.",
    site: "@bailnotarie",
    creator: "@bailnotarie",
    images: ["https://bailnotarie.fr/og-cover-v2.png"],
  },
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <PresentationSection />
      
      <BenefitsSection />
      <ProcessSection />
      <StatsSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      
      {/* Section Contact */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Prêt à créer votre bail notarié ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Contactez-nous dès maintenant pour obtenir un devis gratuit et personnalisé
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}