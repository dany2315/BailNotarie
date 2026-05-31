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
// Marge depuis les bords de l'écran
const EDGE_MARGIN = 8;

type Pos = { x: number; y: number };

export function ContactBubble() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  // Mémorise qu'on vient juste de dragger pour ne pas déclencher le click qui suit
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
          setPos(clampToViewport(parsed));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Recadre la bulle dans le viewport en cas de resize
  useEffect(() => {
    if (typeof window === "undefined" || !pos) return;
    const onResize = () => setPos((p) => (p ? clampToViewport(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

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

  // Démarrage du drag (pointer = unifie souris + tactile)
  // On démarre un dragState pour TOUS les pointerdown, y compris sur les boutons.
  // Le seuil DRAG_THRESHOLD distinguera un tap (clic) d'un vrai drag.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    justDraggedRef.current = false;
    const rect = wrapperRef.current.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    try {
      wrapperRef.current.setPointerCapture(e.pointerId);
    } catch {
      // ignore (Safari ancien)
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || e.pointerId !== state.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    if (!state.moved) {
      state.moved = true;
      setDragging(true);
    }
    e.preventDefault();
    const newPos = clampToViewport({
      x: e.clientX - state.offsetX,
      y: e.clientY - state.offsetY,
    });
    setPos(newPos);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || e.pointerId !== state.pointerId) return;
    dragState.current = null;
    try {
      wrapperRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (state.moved) {
      setDragging(false);
      // Le click qui suit immédiatement le pointerup doit être ignoré
      justDraggedRef.current = true;
      if (pos) persistPos(pos);
    }
  }, [pos]);

  // Position de fallback : bottom-right si rien en mémoire,
  // mais bien remontée pour éviter la safe-area iOS / barre nav et donner de l'air
  const positionStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 16, bottom: `calc(env(safe-area-inset-bottom, 0px) + 88px)` };

  const onMainClick = () => {
    // Si on vient de finir un drag, ignorer le click qui suit
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "fixed z-[60] flex items-center gap-2 touch-none select-none",
          dragging && "cursor-grabbing",
          !dragging && "cursor-grab"
        )}
        style={positionStyle}
      >
        {minimized ? (
          <button
            type="button"
            onClick={onMainClick}
            aria-label="Réafficher le support"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full pointer-events-auto",
              "bg-[#4373f5]/40 text-white opacity-60 backdrop-blur-sm transition-all",
              "hover:opacity-100 hover:bg-[#4373f5]"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onMinimizeClick}
              aria-label="Masquer le support"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full pointer-events-auto",
                "bg-slate-900/70 text-white shadow-md backdrop-blur-sm transition-all",
                "hover:bg-slate-900 hover:scale-105"
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onMainClick}
              aria-label="Contacter le support"
              className={cn(
                "flex h-12 items-center gap-2 rounded-full pl-3 pr-4 pointer-events-auto",
                "bg-[#4373f5] text-white shadow-lg shadow-blue-500/30 transition-all duration-200",
                "hover:scale-105 hover:shadow-xl active:scale-95",
                "sm:h-14"
              )}
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-sm font-semibold whitespace-nowrap sm:text-base">
                Support
              </span>
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
            Astuce : glisse la bulle où tu veux, ou clique sur le × pour la
            réduire à un petit point discret.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
