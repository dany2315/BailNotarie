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

  // Fonction helper récursive pour sérialiser les Decimal de Prisma
  const serializeDecimal = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // Détecter et convertir les Decimal de Prisma
    if (obj && typeof obj === 'object') {
      // Vérifier si c'est un Decimal de Prisma
      const isDecimal = 
        obj.constructor?.name === 'Decimal' ||
        (typeof obj.toNumber === 'function' && 
         typeof obj.toString === 'function' && 
         !Array.isArray(obj) && 
         !(obj instanceof Date) &&
         obj.constructor !== Object &&
         obj.constructor !== RegExp);
      
      if (isDecimal) {
        try {
          if (typeof obj.toNumber === 'function') {
            const num = obj.toNumber();
            return isNaN(num) ? null : num;
          }
          const num = Number(obj);
          return isNaN(num) ? null : num;
        } catch {
          try {
            return parseFloat(obj.toString()) || null;
          } catch {
            return null;
          }
        }
      }
      
      // Gérer les Date
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      
      // Gérer les tableaux
      if (Array.isArray(obj)) {
        return obj.map(serializeDecimal);
      }
      
      // Gérer les objets (récursivement)
      const serialized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          serialized[key] = serializeDecimal(obj[key]);
        }
      }
      return serialized;
    }
    
    return obj;
  };

  // Sérialiser le client IMMÉDIATEMENT pour convertir les Decimal en nombres
  // Parcourir récursivement tous les objets pour convertir tous les Decimal
  // Cela évite l'erreur "Only plain objects can be passed to Client Components"
  const serializedClient = serializeDecimal(client);

  // Obtenir les données principales depuis le client sérialisé
  const primaryPerson = serializedClient.persons?.find((p: any) => p.isPrimary) || serializedClient.persons?.[0];
  const entreprise = serializedClient.entreprise;

  // Obtenir le nom du client
  const clientName = serializedClient.type === ClientType.PERSONNE_PHYSIQUE
    ? primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
      : "Client"
    : entreprise?.legalName || entreprise?.name || "Client";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/interface/clients/${serializedClient.id}`}>
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

      <EditClientForm client={serializedClient} />
    </div>
  );
}

