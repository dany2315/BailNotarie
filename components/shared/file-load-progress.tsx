"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const sizeFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${sizeFormat.format(Math.max(1, Math.round(bytes / 1024)))} Ko`;
  return `${sizeFormat.format(bytes / (1024 * 1024))} Mo`;
}

/**
 * Avancement du chargement d'une pièce : pourcentage et taille reçue sur la taille totale.
 * Sans taille connue (ou avant le premier octet), la barre défile sans pourcentage.
 */
export function FileLoadProgress({
  loaded,
  total,
  label = "Chargement de la pièce",
  className,
}: {
  loaded: number;
  total: number | null;
  label?: string;
  className?: string;
}) {
  const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-valuetext={percent != null ? `${percent} %` : undefined}
      className={cn("flex w-full max-w-xs flex-col gap-2", className)}
    >
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{percent != null ? `${percent} %` : loaded > 0 ? formatSize(loaded) : ""}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
        {percent != null ? (
          <div className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out" style={{ width: `${percent}%` }} />
        ) : (
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-primary/70 motion-safe:animate-[file-load-slide_1.1s_ease-in-out_infinite]" />
        )}
      </div>
      <span className="h-4 text-[12px] tabular-nums text-muted-foreground">
        {total ? `${formatSize(loaded)} sur ${formatSize(total)}` : ""}
      </span>
      <style>{`@keyframes file-load-slide { 0% { left: -33%; } 100% { left: 100%; } }`}</style>
    </div>
  );
}
