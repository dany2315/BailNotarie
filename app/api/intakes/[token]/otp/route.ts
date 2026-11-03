import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveIntakeAccount } from "@/lib/intake-session";

/**
 * Code d'accès à un formulaire d'intake. Le code part toujours à l'adresse du dossier, jamais à
 * une adresse saisie par le visiteur ; une fois vérifié, il ouvre une session pour ce client.
 *
 * POST { action: "send" }               → envoie le code
 * POST { action: "verify", code: "…" }  → ouvre la session (cookie)
 */

// 3 envois par lien et par quart d'heure (better-auth limite les essais par code).
const SEND_WINDOW_MS = 15 * 60 * 1000;
const SEND_MAX = 3;
const sendsByToken = new Map<string, number[]>();

function isSendLimited(token: string): boolean {
  const now = Date.now();
  const recent = (sendsByToken.get(token) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  if (recent.length >= SEND_MAX) {
    sendsByToken.set(token, recent);
    return true;
  }
  sendsByToken.set(token, [...recent, now]);
  return false;
}

const VERIFY_ERRORS: Record<string, string> = {
  INVALID_OTP: "Le code est incorrect. Vérifiez-le et réessayez.",
  OTP_EXPIRED: "Le code a expiré. Demandez-en un nouveau.",
  TOO_MANY_ATTEMPTS: "Trop d'essais. Demandez un nouveau code.",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  const link = await prisma.intakeLink.findUnique({ where: { token }, select: { status: true, clientId: true } });
  if (!link || link.status !== "PENDING") {
    return NextResponse.json({ error: "Ce formulaire n'est plus disponible." }, { status: 404 });
  }

  const account = await resolveIntakeAccount(link.clientId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: 409 });

  if (body?.action === "send") {
    if (isSendLimited(token)) {
      return NextResponse.json({ error: "Trop de codes demandés. Réessayez dans quelques minutes." }, { status: 429 });
    }
    try {
      await auth.api.sendVerificationOTP({ body: { email: account.email, type: "sign-in" } });
    } catch (error) {
      console.error("[intake-otp] Envoi du code impossible:", error);
      return NextResponse.json({ error: "Le code n'a pas pu être envoyé. Réessayez." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body?.action === "verify") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Le code contient 6 chiffres." }, { status: 400 });

    const refuse = (errorCode?: string) =>
      NextResponse.json({ error: (errorCode && VERIFY_ERRORS[errorCode]) || "Code invalide ou expiré." }, { status: 400 });
    let result: Response;
    try {
      result = await auth.api.signInEmailOTP({
        body: { email: account.email, otp: code },
        headers: await headers(),
        asResponse: true,
      });
    } catch (error: any) {
      return refuse(error?.body?.code);
    }
    if (!result.ok) return refuse((await result.json().catch(() => null))?.code);

    // Seul le cookie de session est transmis, pas la réponse de better-auth.
    const response = NextResponse.json({ success: true });
    for (const cookie of result.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
    return response;
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
