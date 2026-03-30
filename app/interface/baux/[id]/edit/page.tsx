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

  const formData: any = { id: data.get("id") as string };

  const fields = [
    "propertyId",
    "tenantId",
    "leaseType",
    "bailType",
    "status",
    "effectiveDate",
    "endDate",
    "rentAmount",
    "monthlyCharges",
    "securityDeposit",
    "paymentDay",
  ] as const;

  for (const field of fields) {
    const val = data.get(field);
    if (val !== null && val.toString().trim() !== "") {
      formData[field] = val.toString().trim();
    }
  }

  updateLeaseSchema.parse(formData);
  await updateLease(formData);
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

  const [propertiesResult, allClients] = await Promise.all([
    getProperties({ page: 1, pageSize: 1000 }),
    getAllClients(),
  ]);

  let properties = propertiesResult.data;
  if (lease.property && !properties.find((p: any) => p.id === lease.property.id)) {
    properties = [lease.property, ...properties];
  }

  const tenant = lease.parties?.find((p: any) => p.profilType === "LOCATAIRE");
  let tenants = allClients.filter((c: any) => c.profilType === "LOCATAIRE");
  if (tenant && !tenants.find((t: any) => t.id === tenant.id)) {
    tenants = [tenant, ...tenants];
  }

  const initialData = {
    id: lease.id,
    leaseType: lease.bailFamily || "HABITATION",
    bailType: lease.bailType || "BAIL_NU_3_ANS",
    status: lease.status,
    propertyId: lease.propertyId,
    tenantId: tenant?.id || "",
    effectiveDate: lease.effectiveDate
      ? new Date(lease.effectiveDate).toISOString().split("T")[0]
      : "",
    endDate: lease.endDate ? new Date(lease.endDate).toISOString().split("T")[0] : "",
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
          <h1 className="text-2xl sm:text-3xl font-bold">
            Modifier le bail #{lease.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Modifiez les informations du bail notarié
          </p>
        </div>
      </div>

      <LeaseForm
        onSubmit={handleSubmit}
        initialData={initialData}
        properties={properties}
        parties={tenants}
      />
    </div>
  );
}
