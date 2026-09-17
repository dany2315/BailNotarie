import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";
import { Footer } from "@/components/footer";
import { LpNav } from "@/components/lp/lp-nav";
import { LpHero } from "@/components/lp/lp-hero";
import { LpDefinition } from "@/components/lp/lp-definition";
import "./lptest.css";

/* Sections sous la ligne de flottaison : chargées à la demande pour préserver
   le LCP du hero, comme sur la page d'accueil actuelle. */
const LpProcess = dynamic(() => import("@/components/lp/lp-process").then((m) => m.LpProcess));
const LpShowcase = dynamic(() => import("@/components/lp/lp-showcase").then((m) => m.LpShowcase));
const LpBenefits = dynamic(() => import("@/components/lp/lp-benefits").then((m) => m.LpBenefits));
const LpNotaires = dynamic(() => import("@/components/lp/lp-notaires").then((m) => m.LpNotaires));
const LpTestimonials = dynamic(() => import("@/components/lp/lp-testimonials").then((m) => m.LpTestimonials));
const LpPricing = dynamic(() => import("@/components/lp/lp-pricing").then((m) => m.LpPricing));
const LpFaq = dynamic(() => import("@/components/lp/lp-faq").then((m) => m.LpFaq));
const LpFinalCta = dynamic(() => import("@/components/lp/lp-final-cta").then((m) => m.LpFinalCta));
const ContactForm = dynamic(() => import("@/components/contact-form").then((m) => m.ContactForm));

/**
 * Page de travail du futur design de la landing page.
 *
 * Les données SEO de l'accueil (titre, description, mots-clés, Open Graph)
 * sont reprises telles quelles pour que la comparaison soit fidèle, mais la
 * page est en `noindex` et pointe sa canonique vers `/` : tant que ce design
 * n'est pas promu en page d'accueil, il ne doit pas entrer en concurrence
 * avec elle dans l'index (contenu dupliqué). Au moment de la bascule, il
 * suffira de retirer `customData` ci-dessous.
 */
export const metadata: Metadata = generateDynamicMetadata({
  page: "home",
  customData: { canonical: "/", noIndex: true },
});

export default function LpTestPage() {
  return (
    <div className="lp-root min-h-screen bg-white antialiased">
      <LpNav />

      <main>
        <LpHero />
        <LpDefinition />
        <LpProcess />
        <LpShowcase />
        <LpBenefits />
        <LpNotaires />
        <LpTestimonials />
        <LpPricing />
        <LpFaq />
        <LpFinalCta />

        {/* Contact */}
        <section
          id="contact"
          aria-labelledby="lp-contact-title"
          className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#f7f9ff] to-white py-24 sm:py-28"
        >
          <div aria-hidden className="lp-grid absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2
                id="lp-contact-title"
                className="lp-title lp-balance text-3xl font-bold text-slate-900 sm:text-[2.6rem]"
              >
                Une question ? Contactez-nous
              </h2>
              <p className="lp-balance mt-4 text-lg leading-relaxed text-slate-600">
                Notre équipe est là pour vous accompagner dans la constitution de votre dossier de bail notarié.
              </p>
            </div>
            <ContactForm />
          </div>
        </section>

        <div className="border-t border-slate-200 bg-white py-4 text-center">
          <p className="text-xs text-slate-400">
            *Sous conditions, voir{" "}
            <Link href="/cgv" className="underline underline-offset-2 hover:text-slate-600">
              CGV
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
