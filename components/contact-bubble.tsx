"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, Phone, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const CONTACT_PHONE = "0749387756";
const CONTACT_PHONE_DISPLAY = "07 49 38 77 56";
const CONTACT_EMAIL = "contact@bailnotarie.fr";
const MIN_KEY = "bn-contact-bubble-minimized";
const POS_KEY = "bn-contact-bubble-pos";
// Seuil en pixels au-delà duquel un mouvement est considéré comme un drag (et pas un clic)
const DRAG_THRESHOLD = 6;
const EDGE_MARGIN = 8;

type Pos = { x: number; y: number };

export function ContactBubble() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  // true = bulle collée au bord gauche, false = bord droit (ou fallback right par défaut)
  const [onLeftSide, setOnLeftSide] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
    currentX: number;
    currentY: number;
  } | null>(null);
  const justDraggedRef = useRef(false);

  // Charge l'état initial depuis localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setMinimized(window.localStorage.getItem(MIN_KEY) === "1");
      const raw = window.localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Pos;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Calcule de quel côté la bulle est snappée (pour l'origine du scale du bouton)
  useEffect(() => {
    if (typeof window === "undefined" || !pos) return;
    const w = wrapperRef.current?.offsetWidth ?? 60;
    setOnLeftSide(pos.x + w / 2 < window.innerWidth / 2);
  }, [pos]);

  // Re-snap au bord après mount et sur resize uniquement (jamais en plein drag)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setPos((p) => (p ? snapToEdge(p) : p));
    };
    // Snap initial une fois mounté (les dimensions du wrapper sont alors connues)
    requestAnimationFrame(() => {
      setPos((p) => (p ? snapToEdge(p) : p));
    });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function clampToViewport(p: Pos): Pos {
    if (typeof window === "undefined") return p;
    const el = wrapperRef.current;
    const w = el?.offsetWidth ?? 60;
    const h = el?.offsetHeight ?? 60;
    const maxX = window.innerWidth - w - EDGE_MARGIN;
    const maxY = window.innerHeight - h - EDGE_MARGIN;
    return {
      x: Math.max(EDGE_MARGIN, Math.min(maxX, p.x)),
      y: Math.max(EDGE_MARGIN, Math.min(maxY, p.y)),
    };
  }

  // Rabat horizontalement la position sur le bord le plus proche (gauche ou droite),
  // en gardant la position verticale (clampée au viewport).
  function snapToEdge(p: Pos): Pos {
    if (typeof window === "undefined") return p;
    const el = wrapperRef.current;
    const w = el?.offsetWidth ?? 60;
    const h = el?.offsetHeight ?? 60;
    const centerX = p.x + w / 2;
    const snapLeft = EDGE_MARGIN;
    const snapRight = window.innerWidth - w - EDGE_MARGIN;
    const x = centerX < window.innerWidth / 2 ? snapLeft : snapRight;
    const maxY = window.innerHeight - h - EDGE_MARGIN;
    const y = Math.max(EDGE_MARGIN, Math.min(maxY, p.y));
    return { x, y };
  }

  const persistMinimized = (value: boolean) => {
    setMinimized(value);
    try {
      if (value) window.localStorage.setItem(MIN_KEY, "1");
      else window.localStorage.removeItem(MIN_KEY);
    } catch {
      // ignore
    }
  };

  const persistPos = (p: Pos) => {
    try {
      window.localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {
      // ignore
    }
  };

  // === Listeners natifs non-passifs pour pouvoir preventDefault() sur iOS ===
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onDown = (e: PointerEvent) => {
      // Souris : on n'écoute que le clic gauche
      if (e.pointerType === "mouse" && e.button !== 0) return;

      justDraggedRef.current = false;
      const rect = wrapper.getBoundingClientRect();
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        moved: false,
        currentX: rect.left,
        currentY: rect.top,
      };
      try {
        wrapper.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onMove = (e: PointerEvent) => {
      const state = dragState.current;
      if (!state || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      if (!state.moved) {
        state.moved = true;
        setDragging(true);
      }
      // Bloque le scroll de la page (passive: false ci-dessous)
      e.preventDefault();

      const targetX = e.clientX - state.offsetX;
      const targetY = e.clientY - state.offsetY;
      state.currentX = targetX;
      state.currentY = targetY;

      // Annule l'éventuel ancrage par la droite (laissé par le mode collé à droite)
      // pour que translate3d positionne correctement la bulle pendant le drag
      wrapper.style.right = "";
      wrapper.style.top = "";
      // Application directe via transform → pas de re-render React pendant le drag
      wrapper.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    };

    const onUp = (e: PointerEvent) => {
      const state = dragState.current;
      if (!state || e.pointerId !== state.pointerId) return;
      dragState.current = null;
      try {
        wrapper.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (state.moved) {
        setDragging(false);
        justDraggedRef.current = true;
        // Snap au bord (gauche/droite) le plus proche + Y clampé au viewport
        const final = snapToEdge({ x: state.currentX, y: state.currentY });
        // Petite transition de snap visible (animée par CSS)
        wrapper.style.transition = "transform 180ms ease-out";
        wrapper.style.transform = `translate3d(${final.x}px, ${final.y}px, 0)`;
        // Retire la transition après pour ne pas ralentir un éventuel prochain drag
        window.setTimeout(() => {
          if (wrapper) wrapper.style.transition = "";
        }, 200);
        setPos(final);
        persistPos(final);
      }
    };

    // passive: false pour pouvoir preventDefault() sur iOS Safari
    wrapper.addEventListener("pointerdown", onDown, { passive: false });
    wrapper.addEventListener("pointermove", onMove, { passive: false });
    wrapper.addEventListener("pointerup", onUp, { passive: false });
    wrapper.addEventListener("pointercancel", onUp, { passive: false });

    return () => {
      wrapper.removeEventListener("pointerdown", onDown);
      wrapper.removeEventListener("pointermove", onMove);
      wrapper.removeEventListener("pointerup", onUp);
      wrapper.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // Style de positionnement
  // Quand la bulle est snappée à droite (et qu'on n'est pas en train de drag), on l'ancre
  // par sa DROITE (right: EDGE_MARGIN) au lieu d'utiliser translate3d ancré à gauche.
  // Comme ça, la pill "Support" et le × restent toujours collés au bord droit, sans déborder.
  // En cours de drag, on retombe sur translate3d pour que la bulle suive le doigt.
  const useFallback = pos === null;
  const rightAnchored = !useFallback && !onLeftSide && !dragging;
  const wrapperStyle: React.CSSProperties = useFallback
    ? {
        right: 16,
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 88px)`,
      }
    : rightAnchored
    ? {
        right: EDGE_MARGIN,
        top: pos!.y,
      }
    : {
        left: 0,
        top: 0,
        transform: `translate3d(${pos!.x}px, ${pos!.y}px, 0)`,
      };

  const onMainClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (minimized) persistMinimized(false);
    else setOpen(true);
  };

  const onMinimizeClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    persistMinimized(true);
  };

  return (
    <>
      <div
        ref={wrapperRef}
        className={cn(
          "fixed z-[60] flex items-center gap-2 select-none",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          ...wrapperStyle,
          touchAction: "none",
          willChange: "transform",
        }}
      >
        {minimized ? (
          <button
            type="button"
            onClick={onMainClick}
            aria-label="Réafficher le support"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              "bg-[#4373f5]/40 text-white opacity-60 backdrop-blur-sm transition-colors",
              "hover:opacity-100 hover:bg-[#4373f5]"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onMainClick}
              aria-label="Contacter le support"
              className={cn(
                "flex h-12 items-center gap-2 rounded-full pl-3 pr-4",
                "bg-[#4373f5] text-white shadow-lg shadow-blue-500/30 transition-all duration-150",
                "hover:shadow-xl active:scale-95",
                "sm:h-14",
                // origine du scale opposée au bord pour que l'agrandissement
                // (hover/active/drag) parte du côté libre et ne déborde pas
                onLeftSide ? "origin-left" : "origin-right",
                dragging && "scale-105 shadow-2xl"
              )}
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-sm font-semibold whitespace-nowrap sm:text-base">
                Support
              </span>
            </button>

            <button
              type="button"
              onClick={onMinimizeClick}
              aria-label="Masquer le support"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                "bg-slate-900/70 text-white shadow-md backdrop-blur-sm transition-colors",
                "hover:bg-slate-900"
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contacter le support</DialogTitle>
            <DialogDescription>
              Une question ? Notre équipe est à votre écoute du lundi au
              vendredi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <a
              href={`tel:${CONTACT_PHONE}`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                "border-border hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900">Appeler</p>
                <p className="text-xs text-muted-foreground">{CONTACT_PHONE_DISPLAY}</p>
              </div>
            </a>

            <a
              href={`mailto:${CONTACT_EMAIL}`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                "border-border hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900">Envoyer un email</p>
                <p className="text-xs text-muted-foreground break-all">{CONTACT_EMAIL}</p>
              </div>
            </a>
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Astuce : glisse la bulle de haut en bas et elle se rabat sur le
            bord le plus proche. Le × la réduit à un petit point discret.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
