"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { openConsentBanner } from "@/components/consent/analytics-consent";

/**
 * Réseaux sociaux de BailNotarie (adresses sans paramètres de suivi). Une adresse vide
 * n'affiche pas l'icône : on ne publie jamais de lien qui ne mène nulle part.
 */
const SOCIALS: Array<{ label: string; href: string; icon: React.ReactNode }> = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/bailnotarie/",
    icon: (
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm7 0h3.8v1.5h.06c.53-1 1.83-1.8 3.77-1.8 4.03 0 4.37 2.4 4.37 5.5v5.8h-4v-5.1c0-1.27-.03-2.9-1.77-2.9-1.78 0-2.05 1.38-2.05 2.8v5.2H10v-11Z" />
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/bailnotarie/",
    icon: (
      <path d="M12 2.8c2.99 0 3.35.01 4.53.07 3.04.14 4.46 1.58 4.6 4.6.06 1.18.07 1.54.07 4.53s-.01 3.35-.07 4.53c-.14 3.01-1.56 4.46-4.6 4.6-1.18.06-1.54.07-4.53.07s-3.35-.01-4.53-.07c-3.05-.14-4.46-1.6-4.6-4.6C2.81 15.35 2.8 15 2.8 12s.01-3.35.07-4.53c.14-3.02 1.56-4.46 4.6-4.6C8.65 2.81 9.01 2.8 12 2.8Zm0 4.68a4.52 4.52 0 1 0 0 9.04 4.52 4.52 0 0 0 0-9.04Zm0 7.45a2.93 2.93 0 1 1 0-5.86 2.93 2.93 0 0 1 0 5.86Zm4.7-8.69a1.06 1.06 0 1 0 0 2.12 1.06 1.06 0 0 0 0-2.12Z" />
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1CTLmZiLAL/",
    icon: (
      <path d="M13.5 21.5v-7.7h2.6l.4-3h-3V8.9c0-.87.24-1.46 1.49-1.46h1.6V4.76c-.28-.04-1.22-.12-2.32-.12-2.3 0-3.87 1.4-3.87 3.98v2.22H7.8v3h2.6v7.66h3.1Z" />
    ),
  },
];

/** Liens rangés par besoin. Les ancres sont absolues : elles marchent depuis n'importe quelle page. */
const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Le service",
    links: [
      { label: "Comment ça marche", href: "/#processus" },
      { label: "Habitation ou commercial", href: "/#baux" },
      { label: "Tarif", href: "/#tarif" },
      { label: "Simulateur de prix", href: "/simulateur-prix-bail-notarie" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Aide et accès",
    links: [
      { label: "Constituer mon dossier", href: "/commencer" },
      { label: "Questions fréquentes", href: "/#faq" },
      { label: "Nous contacter", href: "/#contact" },
      { label: "Espace client", href: "/client/login" },
      { label: "Espace notaire", href: "/notaire/login" },
    ],
  },
  {
    title: "Informations",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/politique-confidentialite" },
      { label: "CGU", href: "/cgu" },
      { label: "CGV", href: "/cgv" },
    ],
  },
];

const linkClass = "inline-flex min-h-9 items-center text-[14px] text-slate-600 transition-colors hover:text-[#4373f5]";

export function Footer() {
  const socials = SOCIALS.filter((social) => social.href);
  const year = new Date().getFullYear();

  return (
    <footer className="lp-scene relative isolate overflow-hidden bg-gradient-to-b from-white via-[#f7f9ff] to-[#eef3ff] text-slate-900">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-slate-200" />

      <div className="relative mx-auto max-w-6xl px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Marque, promesse et contact */}
          <div className="lg:col-span-4">
            <Link href="/" aria-label="BailNotarie — accueil" className="-ml-2 inline-flex">
              <Image src="/logoLarge.png" alt="BailNotarie" width={160} height={90} className="h-14 w-auto" />
            </Link>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-slate-600">
              Constitution en ligne de votre dossier de bail notarié : acte authentique, force exécutoire immédiate,
              en une semaine.
            </p>
            <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
              BailNotarie n&apos;est pas un notaire : nous préparons et transmettons votre dossier à nos notaires
              partenaires.
            </p>

            <div className="mt-7 flex flex-col gap-1">
              <a href="tel:0768098624" className="group inline-flex min-h-10 items-center gap-3 text-[14px] font-medium text-slate-900">
                <span className="flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#4373f5] transition-colors group-hover:border-[#4373f5]/40">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                <span className="tabular-nums">07 68 09 86 24</span>
              </a>
              <a href="mailto:contact@bailnotarie.fr" className="group inline-flex min-h-10 items-center gap-3 break-all text-[14px] font-medium text-slate-900">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#4373f5] transition-colors group-hover:border-[#4373f5]/40">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                contact@bailnotarie.fr
              </a>
            </div>

            {socials.length > 0 && (
              <ul className="mt-6 flex gap-2.5" aria-label="Réseaux sociaux">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${social.label} (nouvel onglet)`}
                      className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#4373f5] hover:bg-[#4373f5] hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px]">
                        {social.icon}
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Liens */}
          <nav aria-label="Pied de page" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8 lg:pl-10">
            {COLUMNS.map((column) => (
              <div key={column.title} className={column.title === "Informations" ? "col-span-2 sm:col-span-1" : undefined}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{column.title}</p>
                <ul className={column.title === "Informations" ? "mt-4 grid grid-cols-2 gap-x-6 sm:flex sm:flex-col" : "mt-4 flex flex-col"}>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {column.title === "Informations" && (
                    <li>
                      <button type="button" onClick={openConsentBanner} className={linkClass}>
                        Gérer les cookies
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Appel discret avant la dernière ligne. */}
        <div className="mt-16 flex flex-col gap-4 border-t border-slate-200 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-slate-500">Votre bail notarié commence ici.</p>
          <Link
            href="/commencer"
            className="group inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-slate-900"
          >
            Constituer mon dossier
            <span className="flex size-8 items-center justify-center rounded-full bg-[#4373f5] text-white transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

      </div>

      <div className="relative border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[12.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>&copy; {year} BailNotarie. Tous droits réservés.</p>
          <p>Bail notarié en ligne, habitation et commercial.</p>
        </div>
      </div>
    </footer>
  );
}
