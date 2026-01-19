import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { canAccessBail } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { renewBail } from "@/lib/actions/bail-renewal";
import { BailStatus } from "@prisma/client";
import { RenewBailForm } from "@/components/client/renew-bail-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function RenouvelerBailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, client } = await requireProprietaireAuth();
  const resolvedParams = await params;
  const bailId = resolvedParams.id;

  // Vérifier que le client peut accéder à ce bail
  const hasAccess = await canAccessBail(user.id, bailId);
  if (!hasAccess) {
    notFound();
  }

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      property: true,
    },
  });

  if (!bail) {
    notFound();
  }

  // Vérifier que le bail est terminé
  if (bail.status !== BailStatus.TERMINATED) {
    redirect(`/client/proprietaire/baux/${bailId}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Renouveler le bail</h1>
      <RenewBailForm bail={bail} />
    </div>
  );
}








