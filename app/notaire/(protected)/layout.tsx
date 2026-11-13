import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Espace notaire : un seul écran, le menu latéral des dossiers et le dossier ouvert. */
export default async function NotaireProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.NOTAIRE) redirect("/notaire/login");

  return <main className="h-dvh overflow-hidden">{children}</main>;
}
