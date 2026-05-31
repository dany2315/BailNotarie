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
const POS_KEY = "bn-contact-bubble-pos";
const DRAG_THRESHOLD = 6;
const EDGE_MARGIN = 8;

type Pos = { x: number; y: number };

export function ContactBubble() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  // true = bulle collée au bord gauche, false = bord droit (par défaut)
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

  // Charge la position depuis localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
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

  // Calcule de quel côté la bulle est snappée (gauche/droite)
  useEffect(() => {
    if (typeof window === "undefined" || !pos) return;
    const w = wrapperRef.current?.offsetWidth ?? 48;
    setOnLeftSide(pos.x + w / 2 < window.innerWidth / 2);
  }, [pos, expanded]);

  // Re-snap au bord après mount et sur resize
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setPos((p) => (p ? snapToEdge(p) : p));
    };
    requestAnimationFrame(() => {
      setPos((p) => (p ? snapToEdge(p) : p));
    });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Ferme l'état expansé au clic à l'extérieur
  useEffect(() => {
    if (!expanded) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [expanded]);

  function snapToEdge(p: Pos): Pos {
    if (typeof window === "undefined") return p;
    const el = wrapperRef.current;
    const w = el?.offsetWidth ?? 48;
    const h = el?.offsetHeight ?? 48;
    const centerX = p.x + w / 2;
    const snapLeft = EDGE_MARGIN;
    const snapRight = window.innerWidth - w - EDGE_MARGIN;
    const x = centerX < window.innerWidth / 2 ? snapLeft : snapRight;
    const maxY = window.innerHeight - h - EDGE_MARGIN;
    const y = Math.max(EDGE_MARGIN, Math.min(maxY, p.y));
    return { x, y };
  }

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
        if (expanded) setExpanded(false);
      }
      e.preventDefault();
      const targetX = e.clientX - state.offsetX;
      const targetY = e.clientY - state.offsetY;
      state.currentX = targetX;
      state.currentY = targetY;
      // Annule l'éventuel ancrage par la droite (laissé par le mode expanded)
      // pour que translate3d positionne correctement la bulle pendant le drag
      wrapper.style.right = "";
      wrapper.style.top = "";
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
        const final = snapToEdge({ x: state.currentX, y: state.currentY });
        wrapper.style.transition = "transform 180ms ease-out";
        wrapper.style.transform = `translate3d(${final.x}px, ${final.y}px, 0)`;
        window.setTimeout(() => {
          if (wrapper) wrapper.style.transition = "";
        }, 200);
        setPos(final);
        persistPos(final);
      }
    };

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
  }, [expanded]);

  const useFallback = pos === null;
  // Quand on est étendu sur le côté droit, on ancre le wrapper par sa DROITE
  // (avec `right: EDGE_MARGIN`) au lieu d'utiliser translate3d ancré à gauche.
  // Du coup le wrapper grandit naturellement vers la gauche quand la pill Support
  // apparaît, et celle-ci reste visible au lieu de déborder derrière le bord.
  // En cours de drag, on retombe sur translate3d pour que la bulle suive le doigt.
  const rightAnchored = !useFallback && expanded && !onLeftSide && !dragging;
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

  // Au clic sur l'icône fermée → on développe
  const onIconClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setExpanded(true);
  };

  // Au clic sur le ×  → on referme
  const onCloseClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setExpanded(false);
  };

  // Au clic sur "Support" → ouvre le dialog
  const onSupportClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setDialogOpen(true);
  };

  // Quand on est sur le bord droit, la pill Support sort à GAUCHE du × (ordre: Support, ×)
  // Quand on est sur le bord gauche, elle sort à DROITE du × (ordre: ×, Support)
  const supportSlideClass = onLeftSide
    ? "animate-in fade-in slide-in-from-left-2 duration-200"
    : "animate-in fade-in slide-in-from-right-2 duration-200";

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
        {expanded ? (
          <>
            {/* Si bulle à gauche : × d'abord, puis Support */}
            {onLeftSide && (
              <button
                type="button"
                onClick={onCloseClick}
                aria-label="Fermer le support"
                className={cn(
                  "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full",
                  "bg-[#4373f5] text-white shadow-lg shadow-blue-500/30 transition-shadow",
                  "hover:shadow-xl"
                )}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            <button
              type="button"
              onClick={onSupportClick}
              aria-label="Contacter le support"
              className={cn(
                "flex h-12 items-center gap-2 rounded-full pl-3 pr-4",
                "bg-[#4373f5] text-white shadow-lg shadow-blue-500/30 transition-shadow",
                "hover:shadow-xl active:scale-95",
                "sm:h-14",
                onLeftSide ? "origin-left" : "origin-right",
                supportSlideClass
              )}
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-sm font-semibold whitespace-nowrap sm:text-base">
                Support
              </span>
            </button>

            {/* Si bulle à droite : Support d'abord, puis × */}
            {!onLeftSide && (
              <button
                type="button"
                onClick={onCloseClick}
                aria-label="Fermer le support"
                className={cn(
                  "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full",
                  "bg-[#4373f5] text-white shadow-lg shadow-blue-500/30 transition-shadow",
                  "hover:shadow-xl"
                )}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onIconClick}
            aria-label="Ouvrir le support"
            className={cn(
              "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full",
              "bg-[#4373f5] text-white shadow-lg shadow-blue-500/30 transition-all duration-150",
              "hover:shadow-xl active:scale-95"
            )}
          >
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              onClick={() => setDialogOpen(false)}
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
              onClick={() => setDialogOpen(false)}
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
        </DialogContent>
      </Dialog>
    </>
  );
}
