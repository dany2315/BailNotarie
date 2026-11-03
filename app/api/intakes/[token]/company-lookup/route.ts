import { NextRequest, NextResponse } from "next/server";
import { hasIntakeSession, INTAKE_SESSION_REQUIRED } from "@/lib/intake-session";
import { prisma } from "@/lib/prisma";
import { lookupCompany } from "@/lib/services/company-registry";

// Au plus 10 recherches par lien et par heure, pour qu'un lien d'intake ne serve pas d'annuaire.
// Compteur en mémoire (par instance) : un garde-fou, pas une limite stricte.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_LOOKUPS = 10;
const lookupsByToken = new Map<string, number[]>();

function isRateLimited(token: string): boolean {
  const now = Date.now();
  const recent = (lookupsByToken.get(token) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_LOOKUPS) {
    lookupsByToken.set(token, recent);
    return true;
  }
  recent.push(now);
  lookupsByToken.set(token, recent);
  return false;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const query = request.nextUrl.searchParams.get("q") ?? "";

  const intakeLink = await prisma.intakeLink.findUnique({ where: { token }, select: { status: true, clientId: true } });
  if (!intakeLink || intakeLink.status !== "PENDING") {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }
  if (!(await hasIntakeSession(intakeLink.clientId))) {
    return NextResponse.json({ error: INTAKE_SESSION_REQUIRED }, { status: 401 });
  }

  if (isRateLimited(token)) {
    return NextResponse.json({ found: false, reason: "unavailable" }, { status: 429 });
  }

  const result = await lookupCompany(query);
  return NextResponse.json(result, { status: result.found || result.reason !== "invalid" ? 200 : 400 });
}
