"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";
import { ClientAvatar, LpUserMenu, LpUserPanel, useClientSession } from "./lp-user-menu";

const LINKS = [
  { href: "#processus", label: "Comment ça marche" },
  { href: "#interface", label: "L'interface" },
  { href: "#avantages", label: "Avantages" },
  { href: "#tarif", label: "Tarif" },
  { href: "#faq", label: "FAQ" },
];

const PHONE = "07 49 38 77 56";
const PHONE_HREF = `tel:${PHONE.replace(/\s/g, "")}`;

/**
 * Barre de navigation flottante.
 *
 * Parti pris : la barre ne porte que l'essentiel — repère (logo), navigation,
 * identité et action principale. Le téléphone n'y figure pas : il est présent
 * quatre fois dans la page, dans le menu mobile et dans la bulle de support,
 * et l'entasser ici obligeait à rogner les libellés. Ce qui est gagné en
 * largeur sert à garder les liens visibles dès 1024 px.
 */
export function LpNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const session = useClientSession();
  const navRef = React.useRef<HTMLElement>(null);

  /**
   * Publie la hauteur occupée par la barre (décalage haut compris) dans
   * `--lp-nav-h`. Les contenus figés sous une barre flottante — la section
   * « écran par écran » notamment — s'en servent pour se réserver la place
   * exacte, au lieu d'une valeur en dur qui déborde dès que la barre change
   * de taille d'un appareil à l'autre.
   */
  React.useLayoutEffect(() => {
    const nav = navRef.current;
    const wrapper = nav?.parentElement;
    if (!nav || !wrapper) return;

    const publish = () => {
      // offsetHeight plutôt que le rectangle : insensible à l'animation
      // d'entrée de la barre.
      const offset = parseFloat(window.getComputedStyle(wrapper).paddingTop) || 0;
      document.documentElement.style.setProperty("--lp-nav-h", `${Math.round(nav.offsetHeight + offset)}px`);
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    window.addEventListener("resize", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
    };
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  // On verrouille le scroll derrière le panneau mobile.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Fermeture à la touche Échap.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closeMenu = React.useCallback(() => setOpen(false), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center px-4 pt-3 sm:pt-4">
      {/* Entrée en CSS : la barre est dans le HTML, visible, sans attendre le JS. */}
      <nav
        ref={navRef}
        className={cn(
          "lp-enter-down pointer-events-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-[20px] px-3 py-2.5 transition-all duration-500 sm:gap-4 sm:px-4 sm:py-2",
          scrolled
            ? "border border-white/70 bg-white/85 shadow-[0_10px_40px_-18px_rgba(30,58,138,0.45)] backdrop-blur-xl"
            : "border border-transparent bg-white/50 backdrop-blur-md",
        )}
      >
        <Link href="/" className="flex shrink-0 items-center" aria-label="BailNotarie — accueil">
          <Image
            src="/logoLarge.png"
            alt="BailNotarie"
            width={160}
            height={40}
            priority
            className="h-9 w-auto sm:h-8"
          />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-xl px-2.5 py-2 text-[14px] font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Espace client : avatar seul (l'identité complète est dans le menu)
              ou « Se connecter » pour un visiteur. */}
          <LpUserMenu session={session} />

          <Link
            href="/commencer"
            className="group hidden shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-3.5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_-10px_rgba(53,99,233,0.9)] transition-transform duration-300 hover:-translate-y-0.5 sm:inline-flex sm:px-4"
          >
            <span className="hidden md:inline">Constituer mon dossier</span>
            <span className="md:hidden">Commencer</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>

          {/* Raccourci espace client sur mobile */}
          {session.status === "client" && (
            <Link
              href="/client"
              aria-label="Mon espace client"
              className="flex shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5] focus-visible:ring-offset-2 sm:hidden"
            >
              <ClientAvatar initials={session.initials} size="lg" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-[#4373f5]/30 lg:hidden sm:h-10 sm:w-10"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="lp-swap pointer-events-auto mt-2 max-h-[calc(100dvh-7rem)] w-full max-w-7xl overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_30px_70px_-30px_rgba(30,58,138,0.6)] backdrop-blur-xl lg:hidden"
        >
          <LpUserPanel session={session} onNavigate={closeMenu} />

          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="block rounded-xl px-4 py-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {link.label}
            </a>
          ))}

          <a
            href={PHONE_HREF}
            className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[15px] font-semibold text-slate-700"
          >
            <Phone className="h-4 w-4 text-[#4373f5]" /> {PHONE}
          </a>

          <Link
            href="/commencer"
            onClick={closeMenu}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_-10px_rgba(53,99,233,0.9)] sm:hidden"
          >
            Constituer mon dossier
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
