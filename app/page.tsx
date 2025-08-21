import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { PresentationSection } from "@/components/presentation-section";
import { StatsSection } from "@/components/stats-section";
import { BenefitsSection } from "@/components/benefits-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { CTASection } from "@/components/cta-section";
import { ContactForm } from "@/components/contact-form";
import { Footer } from "@/components/footer";
import dynamic from "next/dynamic";


export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <PresentationSection />
      <StatsSection />
      <BenefitsSection />
      <ProcessSection />
      <TestimonialsSection />
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