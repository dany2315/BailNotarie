import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
import { HeroSectionNew } from "@/components/hero-section-new";
import { Footer } from "@/components/footer";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";

// Lazy load des sections below-the-fold pour améliorer le LCP
const HowItWorksSection = dynamic(() => import("@/components/how-it-works-section").then(mod => ({ default: mod.HowItWorksSection })));
const PartnershipSection = dynamic(() => import("@/components/partnership-section").then(mod => ({ default: mod.PartnershipSection })));
const BenefitsNewSection = dynamic(() => import("@/components/benefits-new-section").then(mod => ({ default: mod.BenefitsNewSection })));
const TestimonialsSection = dynamic(() => import("@/components/testimonials-section").then(mod => ({ default: mod.TestimonialsSection })));
const FAQSection = dynamic(() => import("@/components/faq-section").then(mod => ({ default: mod.FAQSection })));
const CTASection = dynamic(() => import("@/components/cta-section").then(mod => ({ default: mod.CTASection })));
const ContactForm = dynamic(() => import("@/components/contact-form").then(mod => ({ default: mod.ContactForm })));

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