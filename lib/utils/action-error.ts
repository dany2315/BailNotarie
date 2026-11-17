/**
 * Erreurs des actions serveur, lisibles par la personne.
 *
 * En production, Next.js masque le message d'une erreur levée dans une action serveur : l'écran n'affichait que
 * « An error occurred in the Server Components render… ». Les actions concernées renvoient donc l'erreur au lieu
 * de la lever (`guardAction`), et l'écran la relève avec `unwrapAction`, qui la relance côté navigateur avec son
 * message français : les `try / catch` existants des écrans continuent de fonctionner tels quels.
 */

export type ActionFailure = { __actionError: string };

const FALLBACK = "Une erreur est survenue lors de l'enregistrement. Réessayez dans un instant.";

/** Message à montrer pour une erreur levée côté serveur. Jamais de texte technique ni de détail interne. */
export function actionErrorMessage(error: unknown): string {
  const e = error as any;
  if (!e) return FALLBACK;
  // Validation (Zod) : messages des règles, déjà rédigés en français
  if (Array.isArray(e.issues)) {
    const messages = [...new Set(e.issues.map((issue: any) => String(issue?.message || "")).filter(isReadable))] as string[];
    return messages.length ? messages.slice(0, 3).join(" · ") : "Certaines informations sont invalides.";
  }
  const name = String(e.name || "");
  if (name.startsWith("PrismaClient") || typeof e.code === "string" && /^P\d{4}$/.test(e.code)) return FALLBACK;
  const message = String(e.message || "");
  if (/^(Unauthorized|Forbidden|Non autorisé|Non authentifié)/i.test(message)) return "Accès refusé.";
  return isReadable(message) ? message : FALLBACK;
}

/** Message écrit pour une personne (français, sans trace technique). */
function isReadable(message: string): boolean {
  if (!message || message.length > 400) return false;
  if (/invocation|prisma|digest|Server Components|stack|TypeError|ReferenceError|Cannot read|undefined|Invalid input|expected .* received/i.test(message)) return false;
  return true;
}

/** Côté serveur : exécute l'action ; une erreur est renvoyée au lieu d'être levée. */
export async function guardAction<T>(run: () => Promise<T>): Promise<T | ActionFailure> {
  try {
    return await run();
  } catch (error) {
    console.error("[action]", error);
    return { __actionError: actionErrorMessage(error) };
  }
}

/** Côté navigateur : relance l'erreur renvoyée par une action, avec son message lisible. */
export async function unwrapAction<T>(pending: Promise<T | ActionFailure>): Promise<T> {
  const result = await pending;
  if (result && typeof result === "object" && "__actionError" in (result as any)) {
    throw new Error((result as ActionFailure).__actionError);
  }
  return result as T;
}
