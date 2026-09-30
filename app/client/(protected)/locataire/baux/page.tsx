import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getClientBails } from "@/lib/actions/client-space";
import { ProfilType } from "@prisma/client";
import { TenantBaux } from "@/components/client-v2/tenant";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireBauxPage() {
  const { client } = await requireLocataireAuth();
  const baux = await getClientBails(client.id, ProfilType.LOCATAIRE);

  /* L'en-tête et le décompte vivent désormais dans le composant, avec le
     reste de la mise en page. La page ne fait que charger. */
  return <TenantBaux baux={baux} />;
}
