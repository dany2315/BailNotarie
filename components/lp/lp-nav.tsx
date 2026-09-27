"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";
import { LpUserMenu, useClientSession, useDossierCta } from "./lp-user-menu";

/* Les ancres restent des <a> : le navigateur les résout sans passer par le
   routeur. Le blog est une page à part entière, donc un <Link> — il est
   préchargé et la navigation reste côté client. */
const LINKS = [
  { href: "#processus", label: "Comment ça marche" },
  { href: "#visite-guidee", label: "Visite guidée" },
  { href: "#avantages", label: "Avantages" },
  { href: "#tarif", label: "Tarif" },
  { href: "#faq", label: "FAQ" },
  { href: "/simulateur-prix-bail-notarie", label: "Simulateur" },
  { href: "/blog", label: "Blog" },
];

const isPage = (href: string) => href.startsWith("/");

const PHONE = "07 49 38 77 56";
const PHONE_HREF = `tel:${PHONE.replace(/\s/g, "")}`;

/**
 * Barre de navigation du site.
 *
 * Parti pris : la barre ne porte que l'essentiel — repère (logo), navigation,
 * identité et action principale. Le téléphone n'y figure pas : il est présent
 * quatre fois dans la page d'accueil, dans le menu mobile et dans la bulle de
 * support, et l'entasser ici obligeait à rogner les libellés. Ce qui est gagné
 * en largeur sert à garder les liens visibles dès 1024 px.
 *
 * Elle sert toutes les pages publiques, et s'adapte à deux situations :
 *
 * Elle flotte partout : pastille arrondie détachée des bords, posée au-dessus
 * de la page, translucide en haut puis opaque au défilement, le contenu
 * passant dessous en fondu. La marge qui l'entoure laisse voir la page
 * elle-même — c'est ce qui la fait flotter plutôt que la poser.
 *
 * Sur l'accueil, le hero est construit pour commencer sous elle : rien à
 * réserver. Ailleurs, les pages ne le sont pas, donc la barre pose derrière
 * elle un bloc de sa propre hauteur, à l'intérieur du conteneur de la page —
 * le fond de celle-ci remonte ainsi jusqu'en haut de l'écran et c'est lui,
 * et non celui du document, qu'on aperçoit autour de la pastille.
 *
 * `overlay` supprime ce bloc, pour les pages qui dégagent déjà le haut :
 * l'article de blog, dont l'image de couverture est pleine page et n'a rien
 * à lire dans sa partie haute, gagne à la voir passer dessous.
 *
 * Les ancres de section n'existent que sur l'accueil : hors de celle-ci elles
 * sont préfixées par `/` pour y ramener le visiteur, au lieu de ne rien faire.
 */
export function LpNav({ overlay = false }: { overlay?: boolean } = {}) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const session = useClientSession();
  const cta = useDossierCta();
  const navRef = React.useRef<HTMLElement>(null);
  const pathname = usePathname();
  const onHome = pathname === "/";

  /** Une ancre ne vaut que sur l'accueil ; ailleurs, on y renvoie. */
  const resolve = React.useCallback(
    (href: string) => (href.startsWith("#") && !onHome ? `/${href}` : href),
    [onHome],
  );

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
    <>
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center px-4 pt-3 sm:pt-4">
      {/* Entrée en CSS : la barre est dans le HTML, visible, sans attendre le JS. */}
      <nav
        ref={navRef}
        className={cn(
          "lp-enter-down pointer-events-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-[20px] px-3 py-2.5 transition-all duration-500 sm:gap-4 sm:px-4 sm:py-2",
          // Hors de l'accueil, la page commence juste sous la barre : celle-ci
          // est opaque d'emblée, sans quoi les premiers mots se liraient au
          // travers.
          scrolled || !onHome
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
          {LINKS.map((link) => {
            const className =
              "whitespace-nowrap rounded-xl px-2.5 py-2 text-[14px] font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-900";
            return isPage(link.href) || !onHome ? (
              <Link key={link.href} href={resolve(link.href)} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className={className}>
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Espace client, à toutes les largeurs : avatar seul pour un client
              connecté — l'identité complète et la déconnexion sont dans son
              menu — ou « Se connecter » pour un visiteur. Sur téléphone, ces
              deux entrées restent dans la barre : aller les chercher derrière
              le menu déroulant ajoutait un geste à l'action la plus courante
              des clients qui reviennent. */}
          <LpUserMenu session={session} />

          <Link
            href={cta.href}
            className="group hidden shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-3.5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_-10px_rgba(53,99,233,0.9)] transition-transform duration-300 hover:-translate-y-0.5 sm:inline-flex sm:px-4"
          >
            {/* Libellé long quand la place le permet : de 768 à 1023 px la barre
                n'a pas encore ses liens, au-delà de 1280 px elle a de la marge.
                Entre les deux, « Commencer » laisse les sept liens respirer. */}
            <span className="hidden md:inline lg:hidden xl:inline">
              {cta.connected ? cta.label : "Constituer mon dossier"}
            </span>
            <span className="md:hidden lg:inline xl:hidden">
              {cta.connected ? "Mon espace" : "Commencer"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>

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
          /* Hors flux : en mode collant, un panneau dans le flux pousserait la
             page vers le bas à l'ouverture du menu. */
          className="lp-swap pointer-events-auto absolute inset-x-4 top-full mx-auto mt-2 max-h-[calc(100dvh-7rem)] max-w-7xl overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_30px_70px_-30px_rgba(30,58,138,0.6)] backdrop-blur-xl lg:hidden"
        >
          {LINKS.map((link) => {
            const className =
              "block rounded-xl px-4 py-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50";
            return isPage(link.href) || !onHome ? (
              <Link key={link.href} href={resolve(link.href)} onClick={closeMenu} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} onClick={closeMenu} className={className}>
                {link.label}
              </a>
            );
          })}

          <a
            href={PHONE_HREF}
            className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[15px] font-semibold text-slate-700"
          >
            <Phone className="h-4 w-4 text-[#4373f5]" /> {PHONE}
          </a>

          {/* L'action principale n'est proposée qu'à qui ne l'a pas déjà faite :
              un client connecté a son espace dans la barre, et lui offrir
              d'ouvrir un dossier reviendrait à lui proposer de recommencer.
              Au-delà de 640 px, la barre porte déjà ce bouton. */}
          {!cta.connected && (
            <Link
              href="/commencer"
              onClick={closeMenu}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_-10px_rgba(53,99,233,0.9)] sm:hidden"
            >
              Constituer mon dossier
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>

      {/* Réserve la hauteur de la barre à l'intérieur du conteneur de la page,
          pour que son fond remonte derrière la pastille. `--lp-nav-h` est
          publiée ci-dessus ; la valeur de repli couvre le premier rendu. */}
      {!onHome && !overlay && (
        <div aria-hidden style={{ height: "calc(var(--lp-nav-h, 76px) + 0.75rem)" }} />
      )}
    </>
  );
}
