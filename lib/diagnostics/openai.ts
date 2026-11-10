// Côté serveur uniquement : lit OPENAI_API_KEY (jamais importé par un composant client).
import { DIAGNOSTIC_JSON_SCHEMA, DIAGNOSTIC_SYSTEM_PROMPT, type DiagnosticExtraction } from "./schema";

/**
 * Lecture des diagnostics par l'API OpenAI (Chat Completions, réponse JSON stricte).
 * Même appel que le service ia-bailnotarie, testé le 30/09/2026 sur nos diagnostics.
 */

/** Prix publics en dollars par million de jetons (entrée, sortie), relevés le 10/11/2026. */
const PRICES: Record<string, { input: number; output: number }> = {
  "gpt-6.1-sol": { input: 2, output: 10 },
  "gpt-6-luna": { input: 0.1, output: 0.5 },
  "gpt-5.6-luna": { input: 0.2, output: 1.2 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
};

export const DEFAULT_DIAGNOSTIC_MODEL = "gpt-6.1-sol";

export function diagnosticModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_DIAGNOSTIC_MODEL;
}

export function isDiagnosticAnalysisConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface DiagnosticFile {
  name: string;
  mimeType: string;
  data: Buffer;
}

export interface DiagnosticModelResult {
  extraction: DiagnosticExtraction;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
}

/** Erreur lisible par l'équipe (affichée telle quelle sur la fiche). */
export class DiagnosticAnalysisError extends Error {}

function filePart(file: DiagnosticFile) {
  const base64 = file.data.toString("base64");
  if (file.mimeType.startsWith("image/")) {
    return { type: "image_url", image_url: { url: `data:${file.mimeType};base64,${base64}`, detail: "high" } };
  }
  return { type: "file", file: { filename: file.name, file_data: `data:${file.mimeType || "application/pdf"};base64,${base64}` } };
}

export async function readDiagnostics(files: DiagnosticFile[], hint?: string): Promise<DiagnosticModelResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new DiagnosticAnalysisError("Clé OpenAI absente : ajoutez OPENAI_API_KEY dans les variables d'environnement.");
  const model = diagnosticModel();

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: DIAGNOSTIC_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: `Fichiers fournis : ${files.map((file) => file.name).join(", ")}${hint ? `\n${hint}` : ""}` },
          ...files.map(filePart),
        ],
      },
    ],
    response_format: { type: "json_schema", json_schema: { name: "diagnostics", schema: DIAGNOSTIC_JSON_SCHEMA, strict: true } },
    max_completion_tokens: 16000,
  };
  const effort = process.env.OPENAI_REASONING_EFFORT ?? "low";
  if (effort) body.reasoning_effort = effort;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Un dossier de 70 pages prend environ 2 minutes ; la fonction Vercel s'arrête à 5.
      signal: AbortSignal.timeout(270_000),
    });
  } catch {
    throw new DiagnosticAnalysisError("OpenAI ne répond pas : réessayez dans quelques minutes.");
  }

  const payload: any = await response.json().catch(() => null);
  if (!response.ok) {
    const message: string = payload?.error?.message || `erreur ${response.status}`;
    console.error("[diagnostics] OpenAI", response.status, message);
    if (response.status === 401) throw new DiagnosticAnalysisError("Clé OpenAI refusée : vérifiez OPENAI_API_KEY.");
    if (response.status === 429) throw new DiagnosticAnalysisError("Quota OpenAI atteint : vérifiez le plafond de dépenses du compte.");
    if (response.status === 413 || /too large|maximum|pages/i.test(message)) {
      throw new DiagnosticAnalysisError("Fichiers trop volumineux pour l'analyse (trop de pages) : analysez un fichier plus léger.");
    }
    throw new DiagnosticAnalysisError(`OpenAI a refusé l'analyse (${message.slice(0, 160)}).`);
  }

  const choice = payload?.choices?.[0];
  if (choice?.message?.refusal) throw new DiagnosticAnalysisError("Le modèle a refusé de lire ces fichiers.");
  if (choice?.finish_reason === "length" || !choice?.message?.content) {
    throw new DiagnosticAnalysisError("Réponse du modèle incomplète : relancez l'analyse.");
  }
  let extraction: DiagnosticExtraction;
  try {
    extraction = JSON.parse(choice.message.content);
  } catch {
    throw new DiagnosticAnalysisError("Réponse du modèle illisible : relancez l'analyse.");
  }

  const inputTokens: number | null = payload?.usage?.prompt_tokens ?? null;
  const outputTokens: number | null = payload?.usage?.completion_tokens ?? null;
  const price = PRICES[model] ?? PRICES[String(payload?.model ?? "")];
  const costUsd =
    price && inputTokens != null && outputTokens != null
      ? Math.round(((inputTokens * price.input + outputTokens * price.output) / 1_000_000) * 10000) / 10000
      : null;

  return { extraction, model: String(payload?.model || model), inputTokens, outputTokens, costUsd };
}
