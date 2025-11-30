import type { Metadata } from "next";
import { Header } from "@/components/header";
import { HeroSectionNew } from "@/components/hero-section-new";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { PartnershipSection } from "@/components/partnership-section";
import { BenefitsNewSection } from "@/components/benefits-new-section";
import { StatsSection } from "@/components/stats-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { FAQSection } from "@/components/faq-section";
import { CTAFinalSection } from "@/components/cta-final-section";
import { ContactForm } from "@/components/contact-form";
import { Footer } from "@/components/footer";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";
import { CTASection } from "@/components/cta-section";

export const metadata: Metadata = generateDynamicMetadata({ page: 'home' });

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Hero Section - Solution 100% en ligne */}
      <HeroSectionNew />
      
      {/* Comment ça marche - 3 étapes */}
      <HowItWorksSection />
      
      {/* Partenariat avec notaires */}
      <PartnershipSection />
      
      {/* Avantages - 100% digital, 48h, gratuit */}
      <BenefitsNewSection />
      
      {/* Témoignages */}
      <TestimonialsSection />
      
      {/* FAQ */}
      <FAQSection />
      
      {/* CTA Final */}
      <CTASection />
      
      {/* Section Contact */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Une question ? Contactez-nous
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Notre équipe est là pour vous accompagner dans la constitution de votre dossier
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}