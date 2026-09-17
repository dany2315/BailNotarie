"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#processus", label: "Comment ça marche" },
  { href: "#interface", label: "L'interface" },
  { href: "#avantages", label: "Avantages" },
  { href: "#tarif", label: "Tarif" },
  { href: "#faq", label: "FAQ" },
];

export function LpNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { scrollY } = useScroll();

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

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4">
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "pointer-events-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-2xl px-3 py-2 transition-all duration-500 sm:px-4",
          scrolled
            ? "border border-white/70 bg-white/85 shadow-[0_10px_40px_-18px_rgba(30,58,138,0.45)] backdrop-blur-xl"
            : "border border-transparent bg-white/50 backdrop-blur-md",
        )}
      >
        <Link href="/" className="flex shrink-0 items-center" aria-label="BailNotarie — accueil">
          <Image src="/logoLarge.png" alt="BailNotarie" width={140} height={36} priority className="h-8 w-auto" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-[14px] font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="tel:0749387756"
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13.5px] font-semibold text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9] sm:inline-flex"
          >
            <Phone className="h-3.5 w-3.5" />
            07 49 38 77 56
          </a>
          {/* Sur mobile, la barre se limite au logo et au menu : le CTA est
              repris dans le panneau déroulant. */}
          <Link
            href="/commencer"
            className="group hidden shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-3.5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_-10px_rgba(53,99,233,0.9)] transition-transform duration-300 hover:-translate-y-0.5 sm:inline-flex sm:px-4"
          >
            <span className="hidden md:inline">Constituer mon dossier</span>
            <span className="md:hidden">Commencer</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          >
            {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </motion.nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto fixed inset-x-4 top-[72px] z-50 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_30px_70px_-30px_rgba(30,58,138,0.6)] backdrop-blur-xl lg:hidden"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </a>
          ))}
          <a
            href="tel:0749387756"
            className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[15px] font-semibold text-slate-700"
          >
            <Phone className="h-4 w-4 text-[#4373f5]" /> 07 49 38 77 56
          </a>
          <Link
            href="/commencer"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_-10px_rgba(53,99,233,0.9)] sm:hidden"
          >
            Constituer mon dossier
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
