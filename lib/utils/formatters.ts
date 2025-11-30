import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: fr });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: fr });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatSurface(surface: number | null | undefined): string {
  if (surface === null || surface === undefined) return "-";
  return `${surface.toLocaleString("fr-FR")} m²`;
}

export function truncate(str: string | null | undefined, length: number = 50): string {
  if (!str) return "-";
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}


