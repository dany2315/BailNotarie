import { getClient } from "@/lib/actions/clients";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientType } from "@prisma/client";
import { EditClientForm } from "@/components/clients/edit-client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const client = await getClient(resolvedParams.id);

  if (!client) {
    notFound();
  }

  const clientName = client.type === ClientType.PERSONNE_PHYSIQUE
    ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
    : client.legalName || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/interface/clients/${client.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier {clientName || "le client"}</h1>
          <p className="text-muted-foreground mt-1">
            Modifier les informations du client
          </p>
        </div>
      </div>

      <EditClientForm client={client} />
    </div>
  );
}

