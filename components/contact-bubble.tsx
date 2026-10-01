"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
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

  // Quand on passe de tiny dot à pill complète (ou inverse), la largeur du wrapper change
  // → il faut re-snapper pour que la pill complète ne déborde pas du bord droit.
  // requestAnimationFrame attend que React ait rendu la nouvelle taille avant de mesurer.
  useEffect(() => {
    requestAnimationFrame(() => {
      setPos((p) => (p ? snapToEdge(p) : p));
    });
  }, [minimized]);

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

      // Application directe via transform → pas de re-render React pendant le drag
      wrapper.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    };

    const onUp = (e: PointerEvent) => {
      const state = dragState.current;
      if (!state || e.pointerId !== state.pointerId) return;
      dragState.current = null;
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

    // L'appui est écouté sur la bulle ; le déplacement et le relâchement le
    // sont sur la fenêtre.
    //
    // Ce partage remplace `setPointerCapture`, qui tenait ce rôle et coûtait
    // les deux boutons : un élément qui capture le pointeur reçoit aussi le
    // `click` à la place de la cible réelle, si bien que « Support » et la
    // croix ne voyaient jamais le leur. Écouter sur la fenêtre suit le doigt
    // partout, y compris hors de la bulle et au premier mouvement brusque,
    // sans rien détourner. Les écouteurs sortent immédiatement tant qu'aucun
    // appui n'est en cours sur la bulle.
    //
    // passive: false pour pouvoir preventDefault() sur iOS Safari.
    wrapper.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: false });
    window.addEventListener("pointercancel", onUp, { passive: false });

    return () => {
      wrapper.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // Style de positionnement : transform si on a une position, sinon fallback bottom-right
  const useFallback = pos === null;
  const wrapperStyle: React.CSSProperties = useFallback
    ? {
        right: 16,
        // Au-dessus du bouton de retour en haut, qui occupe le ras du coin :
        // 20 px de garde + ses 44 px + 48 px de respiration. `max` et non une
        // addition, car la barre d'onglets porte déjà le décalage de sécurité
        // dans sa hauteur.
        bottom: `calc(max(var(--bn-dock-h, 0px), env(safe-area-inset-bottom, 0px)) + 112px)`,
      }
    : {
        left: 0,
        top: 0,
        // Translation plate au repos. `translate3d` promeut la bulle sur sa
        // propre couche de composition en permanence ; quand elle change de
        // taille (pastille réduite), la couche laissée derrière peut rester
        // affichée telle quelle — c'est le rectangle clair qui apparaissait
        // à la place du fond. Le glisser, lui, pose `translate3d` directement
        // dans le style de l'élément : il garde son accélération.
        transform: `translate(${pos!.x}px, ${pos!.y}px)`,
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

  // La bulle de support n'est pas montrée dans le back-office (/interface/*)
  if (pathname?.startsWith("/interface")) {
    return null;
  }

  return (
    <>
      <div
        ref={wrapperRef}
        className={cn(
          "fixed z-[60] flex items-center gap-2 select-none",
          // La messagerie du bail occupe le même coin : on s'efface le temps
          // de la conversation (marque posée par ChatDock).
          "[html[data-chat-open]_&]:hidden",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          ...wrapperStyle,
          touchAction: "none",
          // Annoncé pendant le glisser seulement : `will-change` permanent
          // maintient une couche dédiée tout le temps, pour un gain nul hors
          // déplacement et le même risque de rémanence.
          willChange: dragging ? "transform" : undefined,
        }}
      >
        {minimized ? (
          <button
            type="button"
            onClick={onMainClick}
            aria-label="Réafficher le support"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              // Sans `backdrop-blur` : un filtre d'arrière-plan oblige le
              // navigateur à isoler ce qui se trouve dessous, et c'est le
              // second moyen d'obtenir une zone qui ne se repeint plus. La
              // pastille reste lisible avec un aplat un peu plus franc.
              "bg-[#4373f5]/70 text-white opacity-70 transition-colors",
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
                // Une pastille d'invitation, pas un bandeau : elle flotte sur
                // du contenu, et chaque pixel qu'elle prend en cache un.
                "flex h-10 items-center gap-1.5 rounded-full pl-2.5 pr-3.5",
                "bg-[#4373f5] text-white shadow-lg shadow-blue-500/30 transition-all duration-150",
                "hover:shadow-xl active:scale-95",
                "sm:h-11",
                // origine du scale opposée au bord pour que l'agrandissement
                // (hover/active/drag) parte du côté libre et ne déborde pas
                onLeftSide ? "origin-left" : "origin-right",
                dragging && "scale-105 shadow-2xl"
              )}
            >
              <MessageCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              <span className="whitespace-nowrap text-[13px] font-semibold sm:text-sm">
                Support
              </span>
            </button>

            <button
              type="button"
              onClick={onMinimizeClick}
              aria-label="Masquer le support"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                // Même raison que la pastille réduite, et c'est ici le cas le
                // plus probable : ce bouton est justement celui qui disparaît,
                // et son filtre d'arrière-plan couvrait exactement la zone
                // restée claire.
                "bg-slate-900/80 text-white shadow-md transition-colors",
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
