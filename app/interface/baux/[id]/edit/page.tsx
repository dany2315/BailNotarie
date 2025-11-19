import { getLease, updateLease } from "@/lib/actions/leases";
import { notFound } from "next/navigation";
import { LeaseForm } from "@/components/leases/lease-form";
import { updateLeaseSchema } from "@/lib/zod/lease";
import { getProperties } from "@/lib/actions/properties";
import { getAllClients } from "@/lib/actions/clients";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function handleSubmit(data: FormData) {
  "use server";
  
  // Convertir FormData en objet
  const formData: any = {
    id: data.get("id") as string,
  };
  
  const propertyId = data.get("propertyId");
  if (propertyId) formData.propertyId = propertyId.toString();
  
  const tenantId = data.get("tenantId");
  if (tenantId) formData.tenantId = tenantId.toString();
  
  const leaseType = data.get("leaseType");
  if (leaseType) formData.leaseType = leaseType.toString();
  
  const status = data.get("status");
  if (status) formData.status = status.toString();
  
  const effectiveDate = data.get("effectiveDate");
  if (effectiveDate && effectiveDate.toString().trim() !== "") {
    formData.effectiveDate = effectiveDate.toString().trim();
  }
  
  const endDate = data.get("endDate");
  if (endDate && endDate.toString().trim() !== "") {
    formData.endDate = endDate.toString().trim();
  }
  
  const rentAmount = data.get("rentAmount");
  if (rentAmount && rentAmount.toString().trim() !== "") {
    formData.rentAmount = rentAmount.toString().trim();
  }
  
  const monthlyCharges = data.get("monthlyCharges");
  if (monthlyCharges && monthlyCharges.toString().trim() !== "") {
    formData.monthlyCharges = monthlyCharges.toString().trim();
  }
  
  const securityDeposit = data.get("securityDeposit");
  if (securityDeposit && securityDeposit.toString().trim() !== "") {
    formData.securityDeposit = securityDeposit.toString().trim();
  }
  
  const paymentDay = data.get("paymentDay");
  if (paymentDay && paymentDay.toString().trim() !== "") {
    formData.paymentDay = paymentDay.toString().trim();
  }

  // Validation avec Zod avant d'appeler updateLease
  try {
    updateLeaseSchema.parse(formData);
    await updateLease(formData);
  } catch (error: any) {
    throw error;
  }
}

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const lease = await getLease(resolvedParams.id);

  if (!lease) {
    notFound();
  }

  // Récupérer la liste des propriétés et des clients (locataires) pour les selects
  const [propertiesResult, allClients] = await Promise.all([
    getProperties({
      page: 1,
      pageSize: 1000,
    }),
    getAllClients(),
  ]);

  // Filtrer pour ne garder que les locataires
  const tenants = allClients.filter((client: any) => client.profilType === "LOCATAIRE");

  // Trouver le locataire dans les parties
  const tenant = lease.parties?.find((p: any) => p.profilType === "LOCATAIRE");
  
  // Mapper bailFamily vers leaseType pour le formulaire
  const bailFamilyToLeaseType: Record<string, string> = {
    HABITATION: "HABITATION",
    MEUBLE: "MEUBLE",
    COMMERCIAL: "COMMERCIAL",
    PROFESSIONNEL: "PROFESSIONNEL",
    SAISONNIER: "SAISONNIER",
    OTHER: "OTHER",
  };

  // Préparer les données initiales pour le formulaire
  const initialData: any = {
    id: lease.id,
    leaseType: bailFamilyToLeaseType[lease.bailFamily] || "HABITATION",
    status: lease.status,
    propertyId: lease.propertyId,
    tenantId: tenant?.id || "",
    effectiveDate: lease.effectiveDate ? new Date(lease.effectiveDate).toISOString().split('T')[0] : "",
    endDate: lease.endDate ? new Date(lease.endDate).toISOString().split('T')[0] : "",
    rentAmount: lease.rentAmount ? lease.rentAmount.toString() : "",
    monthlyCharges: lease.monthlyCharges ? lease.monthlyCharges.toString() : "",
    securityDeposit: lease.securityDeposit ? lease.securityDeposit.toString() : "",
    paymentDay: lease.paymentDay ? lease.paymentDay.toString() : "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/interface/baux/${lease.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier le bail #{lease.id.slice(-8)}</h1>
          <p className="text-muted-foreground mt-1">
            Modifier les informations du bail
          </p>
        </div>
      </div>

      <LeaseForm
        onSubmit={handleSubmit}
        initialData={initialData}
        properties={propertiesResult.data}
        parties={tenants}
      />
    </div>
  );
}

