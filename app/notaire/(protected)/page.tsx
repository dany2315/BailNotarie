import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-helpers";
import { loadNotaireDashboard } from "@/lib/notaire/dashboard";
import { NotaireWorkQueue } from "@/components/notaire/notaire-work-queue";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** Tableau de bord du notaire : ce qu'il a à faire dans les dossiers qui lui sont confiés. */
export default async function NotaireDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await loadNotaireDashboard(user.id);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

  const stages = [
    { label: "En préparation", value: data.counts.preparation, hint: "L'équipe complète le dossier", className: "bg-slate-100 text-slate-800" },
    { label: "À contacter", value: data.counts.aContacter, hint: "Dossiers confiés", className: "bg-orange-100 text-orange-800" },
    { label: "Clients contactés", value: data.counts.contactes, hint: "Provision attendue", className: "bg-blue-100 text-blue-800" },
    { label: "Provision reçue", value: data.counts.provision, hint: "Vers la signature", className: "bg-indigo-100 text-indigo-800" },
    { label: "Signés", value: data.counts.signes, hint: "Dossiers terminés", className: "bg-green-100 text-green-800" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-5 pb-10 sm:px-6 lg:py-7">
      <div>
        <p className="text-sm capitalize text-muted-foreground">{today}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">À traiter</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bienvenue, {user.name || user.email}</p>
      </div>

      <section
        aria-label="Dossiers par étape"
        className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        {stages.map((stage) => (
          <div key={stage.label} className="flex w-36 shrink-0 snap-start flex-col gap-1.5 rounded-xl border bg-card p-3.5 sm:w-auto">
            <span className={cn("w-fit rounded-md px-2 py-0.5 text-xs font-semibold", stage.className)}>{stage.label}</span>
            <span className="text-2xl font-bold">{stage.value}</span>
            <span className="text-xs text-muted-foreground">{stage.hint}</span>
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <NotaireWorkQueue todo={data.todo} waiting={data.waiting} />

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Réponses des clients</h2>
            {data.answers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune réponse ces 7 derniers jours.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {data.answers.map((answer) => (
                  <li key={answer.key} className="flex flex-col gap-0.5 py-2">
                    <Link href={`/notaire/dossiers?dossierId=${answer.assignmentId}#demandes-title`} className="flex items-center justify-between gap-2 text-sm font-semibold hover:underline">
                      <span className="truncate">{answer.recipientName || `Le ${answer.who}`}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                          answer.toReview ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800",
                        )}
                      >
                        {answer.toReview ? "À vérifier" : "Vérifiée"}
                      </span>
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      {answer.who} · {answer.address} · le {dateFmt(answer.submittedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.counts.arretes > 0 && (
            <p className="px-1 text-xs text-muted-foreground">
              {data.counts.arretes} dossier{data.counts.arretes > 1 ? "s" : ""} arrêté{data.counts.arretes > 1 ? "s" : ""} (désistement ou classé sans suite), dans
              la liste des dossiers.
            </p>
          )}
          <Link href="/notaire/dossiers" className="px-1 text-sm font-medium text-primary hover:underline">
            Voir tous les dossiers
          </Link>
        </aside>
      </div>
    </div>
  );
}
