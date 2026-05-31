"use client";

import { useEffect, useState } from "react";
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
const STORAGE_KEY = "bn-contact-bubble-minimized";

export function ContactBubble() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setMinimized(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage non dispo (mode privé Safari par ex)
    }
  }, []);

  const persistMinimized = (value: boolean) => {
    setMinimized(value);
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {minimized ? (
        <button
          type="button"
          onClick={() => persistMinimized(false)}
          aria-label="Réafficher le support"
          className={cn(
            "fixed bottom-3 right-3 z-[60] flex h-6 w-6 items-center justify-center rounded-full",
            "bg-[#4373f5]/40 text-white opacity-60 backdrop-blur-sm transition-all",
            "hover:opacity-100 hover:bg-[#4373f5]",
            "sm:bottom-4 sm:right-4 sm:h-7 sm:w-7"
          )}
        >
          <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      ) : (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-[60] flex items-center gap-2",
            "sm:bottom-6 sm:right-6"
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <button
            type="button"
            onClick={() => persistMinimized(true)}
            aria-label="Masquer le support"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              "bg-slate-900/70 text-white shadow-md backdrop-blur-sm transition-all",
              "hover:bg-slate-900 hover:scale-105"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Contacter le support"
            className={cn(
              "flex h-12 items-center gap-2 rounded-full pl-3 pr-4",
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
        </div>
      )}

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
            Astuce : tu peux masquer la bulle avec le bouton × et la réafficher
            en cliquant sur le petit point qui reste en bas à droite.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
