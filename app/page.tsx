import type { Metadata } from "next";
import Link from "next/link";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";
import { Footer } from "@/components/footer";
import { ScrollReset } from "@/components/scroll-reset";
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
import { LpContact } from "@/components/lp/lp-contact";

export const metadata: Metadata = generateDynamicMetadata({ page: "home" });

export default function Home() {
  return (
    <div className="lp-root min-h-screen bg-white antialiased">
      {/* Un rechargement repart du hero, pas du milieu de la page. */}
      <ScrollReset />
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

        <LpContact />

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
