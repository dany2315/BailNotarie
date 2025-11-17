import { getAllClients } from "@/lib/actions/clients";
import { Column } from "@/components/data-table/data-table";
import { ClientProfilTypeCell, ClientNameCell, ClientDateCell, ClientCreatedByCell } from "@/components/clients/client-table-cells";
import { ClientCreateButton } from "@/components/clients/client-create-button";
import { ClientsTableClient } from "@/components/clients/clients-table-client";

export default async function ClientsPage() {
  // Charger tous les clients une seule fois
  const allClients = await getAllClients();

  const columns: Column<(typeof allClients)[0]>[] = [
    {
      id: "profilType",
      header: "Profil",
      cell: ClientProfilTypeCell,
    },
    {
      id: "name",
      header: "Nom / Raison sociale",
      cell: ClientNameCell,
    },
    {
      id: "email",
      header: "Email",
      accessorKey: "email",
    },
    {
      id: "phone",
      header: "Téléphone",
      accessorKey: "phone",
    },
    {
      id: "createdAt",
      header: "Créé le",
      cell: ClientDateCell,
    },
    {
      id: "createdBy",
      header: "Créé par",
      cell: ClientCreatedByCell,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des propriétaires et locataires
          </p>
        </div>
        <ClientCreateButton />
      </div>

      <ClientsTableClient initialData={allClients} columns={columns} />
    </div>
  );
}

