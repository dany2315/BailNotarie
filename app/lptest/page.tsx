import type { Metadata } from "next";
import Link from "next/link";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";
import { Footer } from "@/components/footer";
import { LpNav } from "@/components/lp/lp-nav";
import { LpChrome } from "@/components/lp/lp-chrome";
import { LpHero } from "@/components/lp/lp-hero";
import { LpDefinition } from "@/components/lp/lp-definition";

/* Toutes les sections sont importées statiquement. Un import dynamique crée
   une frontière Suspense : pendant que son chunk se télécharge, React remplace
   le HTML rendu côté serveur par le repli — la section apparaît vide. Sur un
   réseau mobile lent, cette fenêtre dure assez longtemps pour être vue, et la
   hauteur de la page bouge à mesure que les morceaux arrivent. La page tient
   dans un seul morceau : rien ne peut plus se vider ni se décaler. */
import { LpProcess } from "@/components/lp/lp-process";
import { LpShowcase } from "@/components/lp/lp-showcase";
import { LpBenefits } from "@/components/lp/lp-benefits";
import { LpNotaires } from "@/components/lp/lp-notaires";
import { LpTestimonials } from "@/components/lp/lp-testimonials";
import { LpPricing } from "@/components/lp/lp-pricing";
import { LpFaq } from "@/components/lp/lp-faq";
import { LpFinalCta } from "@/components/lp/lp-final-cta";
import { ContactForm } from "@/components/contact-form";

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
      {/* Accorde les barres du navigateur mobile à la section affichée. */}
      <LpChrome />
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
          data-lp-chrome="#ffffff"
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

        <div data-lp-chrome="#ffffff" className="border-t border-slate-200 bg-white py-4 text-center">
          <p className="text-xs text-slate-400">
            *Sous conditions, voir{" "}
            <Link href="/cgv" className="underline underline-offset-2 hover:text-slate-600">
              CGV
            </Link>
          </p>
        </div>
      </main>

      <div data-lp-chrome="#111827">
        <Footer />
      </div>
    </div>
  );
}
