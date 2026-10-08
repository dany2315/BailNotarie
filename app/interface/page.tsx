import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getAdminDashboardData } from "@/lib/actions/admin-dashboard";
import { DashboardActionButtons } from "@/components/dashboard/dashboard-action-buttons";
import { WorkQueue } from "@/components/dashboard/work-queue";
import { STAGES, STAGE_ORDER, STATUS_LABELS, type BailStatusValue } from "@/lib/utils/bail-stage";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

export default async function InterfacePage() {
  const [user, data] = await Promise.all([getCurrentUser(), getAdminDashboardData()]);
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm capitalize text-muted-foreground">{today}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">À traiter</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bienvenue, {user?.name || user?.email}</p>
        </div>
        <DashboardActionButtons />
      </div>

      <form action="/interface/recherche" method="get" role="search">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            name="q"
            placeholder="Rechercher un dossier, un client, une adresse, un e-mail…"
            className="min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>
      </form>

      {/* Téléphone : une rangée qui défile (la file de travail reste visible
          sans faire défiler quatre rangées de tuiles). */}
      <section
        aria-label="Dossiers par étape"
        className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-7 [&::-webkit-scrollbar]:hidden"
      >
        {STAGE_ORDER.map((key) => {
          const stage = STAGES[key];
          const count = stage.statuses.reduce((sum, s) => sum + (data.statusCounts[s] || 0), 0);
          return (
            <Link
              key={key}
              href={`/interface/baux?status=${stage.statuses.join(",")}`}
              className="flex min-h-11 w-36 shrink-0 snap-start flex-col gap-1.5 rounded-xl border bg-card p-3.5 transition-colors hover:border-foreground/30 sm:w-auto"
            >
              <span className={cn("w-fit rounded-md px-2 py-0.5 text-xs font-semibold", stage.className)}>{stage.label}</span>
              <span className="text-2xl font-bold">{count}</span>
              <span className="text-xs text-muted-foreground">{stage.hint}</span>
            </Link>
          );
        })}
        <Link
          href="/interface/baux?payment=unpaid"
          className="flex min-h-11 w-36 shrink-0 snap-start flex-col gap-1.5 rounded-xl border border-red-200 bg-card p-3.5 transition-colors hover:border-red-400 sm:w-auto"
        >
          <span className="w-fit rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Frais non payés</span>
          <span className="text-2xl font-bold">{data.unpaidCount}</span>
          <span className="text-xs text-muted-foreground">Dossiers en cours</span>
        </Link>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <WorkQueue items={data.queue} />

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border border-red-200 bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Frais de dossier non payés</h2>
              <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">{data.unpaidCount}</span>
            </div>
            {data.unpaid.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dossier en cours sans paiement.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.unpaid.map((bail) => (
                  <li key={bail.id}>
                    <Link href={`/interface/baux/${bail.id}`} className="flex flex-col gap-0.5 rounded-lg bg-red-50 px-3 py-2 hover:bg-red-100">
                      <span className="flex justify-between gap-2">
                        <strong className="text-sm font-semibold">{bail.address}</strong>
                        <span className="whitespace-nowrap text-xs font-semibold text-red-800">
                          {bail.days === 0 ? "aujourd'hui" : `${bail.days} j`}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {STATUS_LABELS[bail.status as BailStatusValue] || bail.status}
                        {bail.ownerName ? ` · ${bail.ownerName}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Un dossier créé depuis l&apos;interface n&apos;est pas payé par défaut, même s&apos;il est en attente du locataire.
            </p>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Demandes en cours des notaires</h2>
            {data.notaireRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {data.notaireRequests.map((request) => (
                  <li key={request.id} className="flex flex-col gap-0.5 py-2">
                    {request.bailId ? (
                      <Link href={`/interface/baux/${request.bailId}`} className="text-sm font-semibold hover:underline">
                        {request.title}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold">{request.title}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {request.notaireName}
                      {request.address ? ` · ${request.address}` : ""} · le {dateFmt(request.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Les discussions entre le notaire et les parties ne sont pas affichées.</p>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Formulaires reçus aujourd&apos;hui</h2>
            {data.receivedToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun pour l&apos;instant.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.receivedToday.map((form) => (
                  <li key={form.id} className="flex justify-between gap-2 text-sm">
                    {form.bailId ? (
                      <Link href={`/interface/baux/${form.bailId}`} className="hover:underline">
                        {form.name || "Client"} ({form.target === "TENANT" ? "locataire" : "propriétaire"})
                      </Link>
                    ) : (
                      <span>
                        {form.name || "Client"} ({form.target === "TENANT" ? "locataire" : "propriétaire"})
                      </span>
                    )}
                    <span className="whitespace-nowrap text-muted-foreground">{timeFmt(form.submittedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
