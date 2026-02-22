import { redirect } from "next/navigation";

export default async function ProprietaireBienDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/client/proprietaire/demandes?selected=${resolvedParams.id}`);
}
