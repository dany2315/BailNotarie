import { notFound, redirect } from "next/navigation";
import { ProfilType } from "@prisma/client";

import { getClientFromUser, getCurrentUser } from "@/lib/auth-helpers";
import { getClientBailDetails } from "@/lib/actions/client-space";
import { BailPage } from "@/components/client-v2/bail-page";

export const dynamic = "force-dynamic";

/* La page d'un bail. L'authentification et le contrôle d'accès sont ceux de
   `/api/client/bails/[id]` : mêmes appels, même règle — propriétaire du bien
   ou partie du bail, sinon rien. */
export default async function ProprietaireBailDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chat?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/client/login");

  const client = await getClientFromUser(user.id);
  if (!client) notFound();

  const { id } = await params;
  const bail = await getClientBailDetails(id, client.id);
  if (!bail) notFound();

  const { chat } = await searchParams;

  // Le locataire, nommé comme le tiroir le faisait.
  const locataire = bail.parties?.find((party: any) => party.profilType === ProfilType.LOCATAIRE);
  const tenantName = locataire?.entreprise
    ? locataire.entreprise.legalName || locataire.entreprise.name
    : locataire?.persons?.[0]
      ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim()
      : null;
  const tenantEmail = locataire?.entreprise
    ? locataire.entreprise.email
    : locataire?.persons?.[0]?.email || null;

  // La mise en page du dossier fournit déjà le conteneur de défilement.
  return (
    <BailPage
      bail={{
        id: bail.id,
        status: bail.status,
        bailType: bail.bailType,
        bailFamily: bail.bailFamily,
        rentAmount: bail.rentAmount,
        monthlyCharges: bail.monthlyCharges,
        securityDeposit: bail.securityDeposit,
        effectiveDate: bail.effectiveDate,
        paymentDay: bail.paymentDay,
        property: bail.property
          ? {
              id: bail.property.id,
              label: bail.property.label,
              fullAddress: bail.property.fullAddress,
            }
          : null,
        documents: bail.documents ?? [],
      }}
      tenantName={tenantName || null}
      tenantEmail={tenantEmail}
      hasNotaire={!!bail.dossierAssignments?.[0]?.notaire}
      notaireName={bail.dossierAssignments?.[0]?.notaire?.name ?? null}
      openChat={chat === "1"}
    />
  );
}
