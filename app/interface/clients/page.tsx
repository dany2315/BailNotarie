import { getClientsList } from "@/lib/actions/admin-clients";
import { ClientsListClient } from "@/components/clients/clients-list-client";
import { ClientsHeaderActions } from "@/components/clients/clients-header-actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const rows = await getClientsList();

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Propriétaires, locataires et prospects.</p>
        </div>
        <ClientsHeaderActions />
      </div>

      <ClientsListClient rows={rows} />

      <p className="text-[13px] text-muted-foreground">
        La date de création et l&apos;auteur sont dans la fiche de chaque client, sous « Détails ».
      </p>
    </div>
  );
}
