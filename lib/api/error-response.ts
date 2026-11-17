import { NextResponse } from "next/server";

/**
 * Statut HTTP d'une erreur levée par une vérification d'accès ou une recherche.
 * Les vérifications de lib/auth-helpers.ts et des actions lèvent « Unauthorized »,
 * « Non authentifié », « Forbidden… », « Non autorisé… » ou « … introuvable » :
 * ce sont des refus (401/403/404), pas des pannes (500).
 */
function messageOf(error: unknown): string {
  if (typeof error === "string") return error;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : "";
}

export function errorStatus(error: unknown): number {
  const message = messageOf(error);
  const text = message.trim().toLowerCase();
  if (text === "unauthorized" || text.startsWith("non authentifié")) return 401;
  if (text.startsWith("forbidden") || text.startsWith("non autorisé") || text.startsWith("accès refusé")) return 403;
  if (text.includes("introuvable") || text.includes("not found")) return 404;
  return 500;
}

/** Réponse JSON d'erreur avec le bon statut : 401, 403, 404, sinon 500. */
export function apiErrorResponse(error: unknown, fallback: string) {
  const message = messageOf(error) || fallback;
  return NextResponse.json({ error: message }, { status: errorStatus(error) });
}
