"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  /**
   * Message principal affiché sous le spinner
   */
  message?: string;
  /**
   * Message secondaire affiché sous le message principal
   */
  description?: string;
  /**
   * Afficher le logo (par défaut: true)
   */
  showLogo?: boolean;
  /**
   * Taille du spinner (par défaut: "default")
   */
  spinnerSize?: "sm" | "default" | "lg";
  /**
   * Type d'affichage (par défaut: "overlay")
   * - "overlay": Overlay plein écran avec backdrop
   * - "inline": Affichage inline sans overlay
   */
  variant?: "overlay" | "inline";
  /**
   * Classes CSS supplémentaires
   */
  className?: string;
}

export function LoadingScreen({
  message = "Chargement...",
  description,
  showLogo = true,
  spinnerSize = "default",
  variant = "overlay",
  className,
}: LoadingScreenProps) {
  const spinnerSizes = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const content = (
    <div className={cn("flex flex-col items-center gap-8 w-full max-w-md px-6", className)}>
      {showLogo && (
        <div className="relative animate-pulse">
          <Image
            src="/logoLarge.png"
            alt="BailNotarie"
            width={200}
            height={60}
            className="h-16 sm:h-20 w-auto opacity-90"
            priority
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Loader2 className={cn("animate-spin text-primary", spinnerSizes[spinnerSize])} />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          {description && (
            <p className="text-xs text-muted-foreground text-center max-w-xs px-4">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center min-h-[200px] w-full py-8">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-300">
      {content}
    </div>
  );
}

