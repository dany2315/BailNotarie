import { redirect } from "next/navigation";

export default async function ProprietaireBailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/client/proprietaire/demandes?open=bail-${resolvedParams.id}`);
}
