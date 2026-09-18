"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Primitives de la landing premium.
   Tout le mouvement passe par des motion values : aucun re-render au survol
   ni au scroll, le compositeur fait le travail.
   ========================================================================= */

/* ---------- Tilt 3D : la carte suit le curseur ---------------------------- */

interface Tilt3DProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Amplitude de rotation en degrés. */
  intensity?: number;
  /** Élévation au survol, en px sur l'axe Z. */
  lift?: number;
  /** Ajoute un reflet lumineux qui suit le curseur. */
  glare?: boolean;
  perspective?: number;
  children: React.ReactNode;
}

export function Tilt3D({
  intensity = 10,
  lift = 24,
  glare = true,
  perspective = 1000,
  className,
  children,
  ...props
}: Tilt3DProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const spring = { stiffness: 220, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useMotionValue(0), spring);
  const rotateY = useSpring(useMotionValue(0), spring);
  const translateZ = useSpring(useMotionValue(0), spring);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useSpring(useMotionValue(0), { stiffness: 160, damping: 26 });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * intensity * 2);
    rotateX.set((0.5 - py) * intensity * 2);
    glareX.set(px * 100);
    glareY.set(py * 100);
  };

  const handleEnter = () => {
    if (reduce) return;
    translateZ.set(lift);
    glareOpacity.set(0.35);
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    translateZ.set(0);
    glareOpacity.set(0);
  };

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.85), transparent 45%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ perspective }}
      className={cn("relative", className)}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      <motion.div
        style={{ rotateX, rotateY, translateZ, transformStyle: "preserve-3d" }}
        className="relative h-full w-full"
      >
        {children}
        {glare && (
          <motion.span
            aria-hidden
            style={{ background: glareBackground, opacity: glareOpacity }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
          />
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------- Spotlight : halo qui suit le curseur sur une carte ------------ */

export function SpotlightCard({
  className,
  color = "rgba(67,115,245,0.18)",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { color?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const opacity = useSpring(useMotionValue(0), { stiffness: 180, damping: 24 });

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  const background = useMotionTemplate`radial-gradient(240px circle at ${x}px ${y}px, ${color}, transparent 72%)`;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => opacity.set(1)}
      onMouseLeave={() => opacity.set(0)}
      className={cn("group/spot relative overflow-hidden", className)}
      {...props}
    >
      <motion.span
        aria-hidden
        style={{ background, opacity }}
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
      />
      {children}
    </div>
  );
}

/* ---------- Apparition au scroll ------------------------------------------ */

/**
 * Marque un élément pour la révélation au scroll.
 *
 * Le contenu reste visible par défaut : il est donc lisible au premier rendu,
 * avant hydratation et sans JavaScript. Seuls les éléments encore hors champ
 * au moment de l'hydratation partent en retrait, puis reviennent quand ils
 * entrent dans le cadre. Un élément déjà à l'écran n'est jamais masqué — c'est
 * ce qui évite le clignotement au rechargement en milieu de page.
 */
export function useReveal<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  {
    threshold = 0.9,
    targets,
  }: {
    threshold?: number;
    /**
     * Éléments à masquer, si ce ne sont pas ceux qu'on observe. Indispensable
     * quand l'animation réduit la boîte à néant — une barre en `scaleX(0)` n'a
     * plus aucune aire, donc elle n'entre jamais « dans le cadre » et resterait
     * invisible à jamais. On observe alors son rail, qui, lui, garde sa taille.
     */
    targets?: () => (HTMLElement | null)[];
  } = {},
) {
  React.useLayoutEffect(() => {
    const observed = ref.current;
    if (!observed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const marked = (targets ? targets() : [observed]).filter(Boolean) as HTMLElement[];
    if (marked.length === 0) return;

    // Déjà visible : on laisse tel quel, sans animation ni masquage.
    if (observed.getBoundingClientRect().top <= window.innerHeight * threshold) return;

    for (const element of marked) element.setAttribute("data-reveal", "hidden");

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        for (const element of marked) element.removeAttribute("data-reveal");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(observed);
    return () => observer.disconnect();
  }, [ref, threshold, targets]);
}

/** Élément révélé au scroll, visible par défaut. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  useReveal(ref);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn("lp-reveal", className)}
      style={
        {
          "--lp-delay": `${delay}s`,
          "--lp-y": `${y}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

/* ---------- Étiquette de section ----------------------------------------- */

export function SectionLabel({
  children,
  tone = "light",
  icon: Icon,
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight",
        tone === "light"
          ? "border border-[#4373f5]/15 bg-white/70 text-[#3563e9] shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur"
          : "border border-white/15 bg-white/[0.07] text-blue-100 backdrop-blur",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------- Bouton principal --------------------------------------------- */

export function GlowButton({
  className,
  children,
  ...props
}: React.ComponentProps<"a">) {
  return (
    <a
      className={cn(
        "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl",
        "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-7 py-3.5 text-[15px] font-semibold text-white",
        "shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_30px_-10px_rgba(53,99,233,0.9)]",
        "transition-all duration-300 hover:shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_18px_40px_-12px_rgba(53,99,233,1)]",
        "hover:-translate-y-0.5 active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5] focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.45)_50%,transparent_62%)] transition-transform duration-700 group-hover/btn:translate-x-full"
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </a>
  );
}

export function GhostButton({
  className,
  children,
  tone = "light",
  ...props
}: React.ComponentProps<"a"> & { tone?: "light" | "dark" }) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-[15px] font-semibold transition-all duration-300 hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5] focus-visible:ring-offset-2",
        tone === "light"
          ? "border border-slate-200 bg-white/80 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur hover:border-[#4373f5]/30 hover:text-[#3563e9]"
          : "border border-white/20 bg-white/[0.06] text-white backdrop-blur hover:border-white/40 hover:bg-white/[0.12]",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

/* ---------- Décors de fond ------------------------------------------------ */

export function AuroraBackdrop({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className={cn(
          "lp-anim-drift absolute -top-40 left-[8%] h-[34rem] w-[34rem] rounded-full blur-[110px]",
          tone === "light" ? "bg-[#4373f5]/18" : "bg-[#4373f5]/35",
        )}
      />
      <div
        className={cn(
          "lp-anim-drift absolute -right-24 top-10 h-[28rem] w-[28rem] rounded-full blur-[110px] [animation-delay:-7s]",
          tone === "light" ? "bg-violet-400/14" : "bg-violet-500/25",
        )}
      />
      <div
        className={cn(
          "lp-anim-drift absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full blur-[120px] [animation-delay:-14s]",
          tone === "light" ? "bg-indigo-400/14" : "bg-indigo-500/25",
        )}
      />
    </div>
  );
}

export function NoiseOverlay({ opacity = 0.035 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="lp-noise pointer-events-none absolute inset-0 mix-blend-soft-light"
      style={{ opacity }}
    />
  );
}

/* ---------- Compteur animé ------------------------------------------------ */

export function CountUp({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1.6,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [value, setValue] = React.useState(reduce ? to : 0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (reduce) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / (duration * 1000), 1);
          // easeOutExpo : démarre vite, s'arrête net sur la valeur cible.
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          setValue(to * eased);
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("fr-FR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ---------- Utilitaire : position de souris normalisée -------------------- */

export function usePointerParallax(strength = 1) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 90, damping: 20, mass: 0.7 });
  const y = useSpring(useMotionValue(0), { stiffness: 90, damping: 20, mass: 0.7 });

  React.useEffect(() => {
    if (reduce) return;
    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2;
      const ny = (event.clientY / window.innerHeight - 0.5) * 2;
      x.set(nx * strength);
      y.set(ny * strength);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [strength, x, y, reduce]);

  return { x, y } as { x: MotionValue<number>; y: MotionValue<number> };
}
