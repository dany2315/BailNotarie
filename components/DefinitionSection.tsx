import Link from "next/link";
import { Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

export function DefinitionSection() {
  return (
    <section
      aria-labelledby="definition-bail-notarie"
      className="relative py-10 bg-linear-to-r from-slate-50 via-blue-50 to-indigo-50 overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-8 left-10 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 right-8 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Card className="p-6 md:p-7 bg-white/80 backdrop-blur-sm border-2 border-blue-100 shadow-xl rounded-2xl">
          <h2 id="definition-bail-notarie" className="text-xl md:text-2xl font-bold text-gray-900">
            Bail notarié : définition
          </h2>

          <p className="mt-3 text-gray-700 leading-relaxed">
            Un <strong>bail notarié</strong>  est un{" "}
            <strong> bail de location en France</strong> signé devant <strong>notaire</strong> en{" "}
            <strong>acte authentique</strong>.{" "}Il peut
                offrir une <strong>force exécutoire</strong>, utile en cas d’impayés. {" "}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-[#4373f5]" />
              Dossier structuré & sécurisé
            </div>

            <span className="hidden sm:inline text-gray-300">•</span>

            <Link
              href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets"
              className="text-sm font-medium text-[#4373f5] hover:underline"
            >
              Prix (2026)
            </Link>

            <Link
              href="/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet"
              className="text-sm font-medium text-[#4373f5] hover:underline"
            >
              Étapes
            </Link>

            <Link
              href="/commencer"
              className="ml-auto inline-flex items-center justify-center rounded-xl bg-[#4373f5] px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Constituer mon dossier
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}