import { redirect } from "next/navigation";
import { getMyComplementRequest } from "@/lib/actions/complement-requests";
import { ComplementRequestView } from "@/components/client-v2/complement-request-view";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function OwnerComplementRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getMyComplementRequest(id);
  if (!request) redirect("/client/proprietaire");
  return <ComplementRequestView request={request} space="proprietaire" />;
}
