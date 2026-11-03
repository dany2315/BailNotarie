import { render } from "@react-email/render";
import type { CreateEmailOptions } from "resend";

const PRODUCTION_HOSTS = new Set(["www.bailnotarie.fr", "bailnotarie.fr"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// NEXT_PUBLIC_URL vaut « https://www.bailnotarie.fr » en production et
// « https://staging.bailnotarie.fr » sur le staging. Next.js l'inscrit dans le
// code au build : elle ne dépend pas de l'exposition des variables système.
function getAppHost(): string | null {
  const rawUrl = process.env.NEXT_PUBLIC_URL;
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`).hostname;
  } catch {
    return null;
  }
}

// Seule la production (www.bailnotarie.fr) envoie des e-mails « normaux ».
// VERCEL_ENV fait foi quand il est présent (« preview » pour le staging et les
// Preview Vercel) ; sinon on se fie à l'URL de l'app. Dev local, staging, ou
// URL absente : les e-mails sont marqués comme envois de test.
export function isProductionEmailEnvironment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) return vercelEnv === "production";

  const host = getAppHost();
  return host !== null && PRODUCTION_HOSTS.has(host);
}

const TEST_SUBJECT_PREFIX = "[TEST]";

function getEnvironmentLabel(): string {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview") {
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    return branch ? `préproduction (branche ${branch})` : "préproduction";
  }

  const host = getAppHost();
  if (!vercelEnv && host && !LOCAL_HOSTS.has(host)) {
    return `préproduction (${host})`;
  }
  return "développement local";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getTestBannerHtml(environmentLabel: string): string {
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'style="background-color:#fef3c7;border-bottom:3px solid #f59e0b;">' +
    '<tr><td style="padding:12px 16px;font-family:Arial,sans-serif;font-size:14px;' +
    'line-height:1.5;color:#78350f;text-align:center;">' +
    "<strong>E-MAIL DE TEST</strong> – envoyé depuis l’environnement de " +
    `${escapeHtml(environmentLabel)}, pas depuis la production.` +
    "</td></tr></table>"
  );
}

// Fin du bloc <Preview> de React Email s'il suit directement <body>, pour que
// le bandeau ne remplace pas le texte d'aperçu (ex. le code OTP).
function findPreviewEnd(html: string, from: number): number | null {
  const rest = html.slice(from);
  // React Email glisse des commentaires (<!--$-->, <!--head-->…) avant l'aperçu
  const opening = /^(?:\s|<!--[\s\S]*?-->)*<div\b[^>]*data-skip-in-text[^>]*>/i.exec(rest);
  if (!opening) return null;

  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = opening[0].length;
  let depth = 1;
  let tag: RegExpExecArray | null;
  while ((tag = divTag.exec(rest))) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return from + tag.index + tag[0].length;
  }
  return null;
}

function injectTestBanner(html: string, bannerHtml: string): string {
  const bodyOpening = /<body\b[^>]*>/i.exec(html);
  if (!bodyOpening) return bannerHtml + html;

  let insertAt = bodyOpening.index + bodyOpening[0].length;
  insertAt = findPreviewEnd(html, insertAt) ?? insertAt;
  return html.slice(0, insertAt) + bannerHtml + html.slice(insertAt);
}

function prefixSubject(subject: string): string {
  return subject.startsWith(TEST_SUBJECT_PREFIX)
    ? subject
    : `${TEST_SUBJECT_PREFIX} ${subject}`;
}

/**
 * Hors production, préfixe l'objet par « [TEST] » et ajoute un bandeau en haut
 * du contenu (HTML et texte). En production, renvoie les options telles quelles.
 */
export async function markEmailIfNotProduction(
  options: CreateEmailOptions
): Promise<CreateEmailOptions> {
  if (isProductionEmailEnvironment()) return options;

  const environmentLabel = getEnvironmentLabel();
  const marked = { ...options } as Record<string, unknown>;

  if (typeof marked.subject === "string") {
    marked.subject = prefixSubject(marked.subject);
  }

  // Resend rend `react` en HTML lui-même ; on le fait ici pour pouvoir y
  // insérer le bandeau. Le résultat envoyé est le même.
  if (marked.react) {
    marked.html = await render(marked.react as Parameters<typeof render>[0]);
    delete marked.react;
  }

  if (typeof marked.html === "string") {
    marked.html = injectTestBanner(marked.html, getTestBannerHtml(environmentLabel));
  }

  if (typeof marked.text === "string") {
    marked.text =
      `[E-MAIL DE TEST – envoyé depuis l’environnement de ${environmentLabel}, ` +
      `pas depuis la production]\n\n${marked.text}`;
  }

  return marked as unknown as CreateEmailOptions;
}
