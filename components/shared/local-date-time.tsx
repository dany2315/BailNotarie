"use client";

import { useEffect, useState } from "react";

/** Fuseau du premier rendu : le même sur le serveur et dans le navigateur. */
const FIRST_RENDER_ZONE = "Europe/Paris";

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function zoneName(date: Date, timeZone: string | undefined, style: "shortOffset" | "longGeneric") {
  try {
    return new Intl.DateTimeFormat("fr-FR", { timeZone, timeZoneName: style })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;
  } catch {
    return undefined;
  }
}

/** « 18/11/2026 14:30 », dans le fuseau donné (celui de l'appareil si aucun). */
export function formatDateTimeIn(date: Date, timeZone?: string, withTime = true) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
    .format(date)
    .replace(",", "");
}

/**
 * Date et heure dans le fuseau de la personne qui regarde (un administrateur en Israël,
 * un client au Canada…), avec ce fuseau indiqué à côté : « 18/11/2026 14:30 (UTC+2) ».
 *
 * Le premier rendu, serveur puis navigateur, est en heure de Paris : les deux textes sont
 * identiques, donc plus d'erreur React n° 418. L'heure locale s'affiche juste après (m22).
 */
export function LocalDateTime({
  value,
  showZone = true,
  fallback = "-",
  mode = "datetime",
  className,
}: {
  value: Date | string | number | null | undefined;
  /** Fuseau à côté de l'heure (par défaut oui). */
  showZone?: boolean;
  fallback?: string;
  /** « time » : l'heure seule (« 14:30 (UTC+2) »). */
  mode?: "datetime" | "time";
  className?: string;
}) {
  const [timeZone, setTimeZone] = useState<string | undefined>(FIRST_RENDER_ZONE);
  useEffect(() => {
    setTimeZone(undefined);
  }, []);

  const date = toDate(value);
  if (!date) return <>{fallback}</>;

  const zone = showZone ? zoneName(date, timeZone, "shortOffset") : undefined;
  return (
    <time
      dateTime={date.toISOString()}
      title={zoneName(date, timeZone, "longGeneric")}
      className={className}
      suppressHydrationWarning
    >
      {mode === "time"
        ? new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date)
        : formatDateTimeIn(date, timeZone)}
      {zone ? ` (${zone})` : ""}
    </time>
  );
}
