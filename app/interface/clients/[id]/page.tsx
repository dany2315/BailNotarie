import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, CircleCheck } from "lucide-react";
import { BailStatus, ClientType, NotaireRequestStatus, ProfilType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClient, getClientMissingData } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { PropertyBailsViewer } from "@/components/clients/property-bails-viewer";
import { ClientMoreMenu } from "@/components/clients/client-more-menu";
import { ClientDocumentsCard, ClientIdentityCard } from "@/components/admin/party-verification-card";
import { RequestMissingButton } from "@/components/leases/request-missing-button";
import { InternalNotes } from "@/components/comments/internal-notes";
import { StateChip } from "@/components/admin/check-list";
import { describeMissingItems } from "@/lib/utils/missing-items";
import { intakeSummary } from "@/lib/utils/intake-summary";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import { getNextAction, getStage, isActiveStage } from "@/lib/utils/bail-stage";
import { cn } from "@/lib/utils";

const PROFIL_LABELS: Record<string, string> = { PROPRIETAIRE: "Propriétaire", LOCATAIRE: "Locataire", LEAD: "Prospect" };
const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Meublé 9 mois",
};
const PROPERTY_TYPE_LABELS: Record<string, string> = { APPARTEMENT: "Appartement", MAISON: "Maison" };
const LEGAL_STATUS_LABELS: Record<string, string> = {
  PLEIN_PROPRIETE: "Pleine propriété",
  CO_PROPRIETE: "Copropriété",
  LOTISSEMENT: "Lotissement",
};
const INTAKE_TARGET_LABELS: Record<string, string> = { OWNER: "Propriétaire", TENANT: "Locataire", LEAD: "Conversion" };

function partyName(party: any): string {
  if (!party) return "";
  if (party.type === "PERSONNE_MORALE") return party.entreprise?.legalName || party.entreprise?.name || "";
  const persons: any[] = party.persons || [];
  // « Claire et Marc Fontaine » quand le nom est commun, sinon les noms complets.
  const lastNames = Array.from(new Set(persons.map((p) => p.lastName).filter(Boolean)));
  if (persons.length > 1 && lastNames.length === 1) {
    return `${persons.map((p) => p.firstName).filter(Boolean).join(" et ")} ${lastNames[0]}`;
  }
  return persons.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ") || persons[0]?.email || "";
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, missingData, bails, intakeLinks, accountCount] = await Promise.all([
    getClient(id),
    getClientMissingData(id),
    // Dossiers du client, avec ce qu'il faut pour l'étape et la prochaine action.
    prisma.bail.findMany({
      where: { parties: { some: { id } } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        bailType: true,
        paidAt: true,
        rentAmount: true,
        property: { select: { fullAddress: true, label: true } },
        parties: {
          select: {
            id: true,
            type: true,
            profilType: true,
            persons: { select: { firstName: true, lastName: true, email: true, isPrimary: true } },
            entreprise: { select: { legalName: true, name: true } },
          },
        },
        dossierAssignments: {
          select: { _count: { select: { requests: { where: { status: NotaireRequestStatus.PENDING } } } } },
        },
      },
    }),
    prisma.intakeLink.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        token: true,
        target: true,
        status: true,
        formEmailSentAt: true,
        formEmailCount: true,
        lastFormEmailSentAt: true,
        firstOpenedAt: true,
        submittedAt: true,
      },
    }),
    prisma.user.count({ where: { clientId: id } }),
  ]);

  if (!client) notFound();

  const isCompany = client.type === ClientType.PERSONNE_MORALE;
  const persons: any[] = client.persons || [];
  const primaryPerson = persons.find((p) => p.isPrimary) || persons[0];
  const clientName = partyName(client) || "Client";
  const clientEmail = isCompany ? client.entreprise?.email : primaryPerson?.email;
  const clientPhone = isCompany ? client.entreprise?.phone : primaryPerson?.phone;

  const properties: any[] = client.ownedProperties || [];
  const activeBails = bails.filter((b) => isActiveStage(getStage(b.status).key));
  const signedRent = bails
    .filter((b) => b.status === BailStatus.SIGNED)
    .reduce((sum, b) => sum + (Number(b.rentAmount) || 0), 0);

  const missingItems = describeMissingItems(missingData);
  const missingCount = (missingData?.totalMissingFields || 0) + (missingData?.totalMissingDocuments || 0);
  const latestIntake = intakeLinks.find((l) => l.status === "PENDING") || intakeLinks[0] || null;
  // Dernier formulaire par destinataire (propriétaire, locataire…).
  const intakesByTarget = Array.from(new Map(intakeLinks.map((l) => [l.target, l])).values());
  const kindLabel = isCompany ? "Société" : persons.length > 1 ? `Particuliers · ${persons.length} personnes` : "Particulier";

  const subtitle = [
    `Client depuis le ${formatDate(client.createdAt)}`,
    `${activeBails.length} dossier${activeBails.length > 1 ? "s" : ""} en cours`,
    client.profilType === ProfilType.PROPRIETAIRE && `${properties.length} bien${properties.length > 1 ? "s" : ""}`,
    signedRent > 0 &&
      (client.profilType === ProfilType.LOCATAIRE ? `loyer ${formatCurrency(signedRent)} / mois` : `${formatCurrency(signedRent)} / mois de loyers`),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5 pb-10">
      <Link href="/interface/clients" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" />
        Clients
      </Link>

      {/* En-tête : comme la fiche dossier, actions sous le titre */}
      <div className="flex flex-col gap-3.5">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StateChip tone="neutral" className="bg-indigo-100 text-indigo-800">
              {PROFIL_LABELS[client.profilType] || client.profilType}
            </StateChip>
            <StateChip tone="neutral">{kindLabel}</StateChip>
            {missingCount > 0 ? (
              <StateChip tone="missing">
                Incomplet · {missingCount} manquant{missingCount > 1 ? "s" : ""}
              </StateChip>
            ) : (
              <StateChip tone="ok">Rien ne manque</StateChip>
            )}
          </div>
          <h1 className="break-words text-[28px] font-bold leading-tight tracking-tight">{clientName}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {missingItems.length > 0 && clientEmail && (
            <div className="w-full sm:order-last sm:w-auto">
              <RequestMissingButton
                recipients={[{ role: PROFIL_LABELS[client.profilType] || "Client", name: clientName, email: clientEmail, items: missingItems }]}
                address={bails[0]?.property?.fullAddress || bails[0]?.property?.label || "votre logement"}
                className="h-11 w-full border-primary bg-primary px-5 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground sm:w-auto"
              />
            </div>
          )}
          {clientPhone && (
            <Button asChild variant="outline" className="h-11 flex-1 px-4 sm:flex-none">
              <a href={`tel:${clientPhone}`}>Appeler</a>
            </Button>
          )}
          {clientEmail && (
            <Button asChild variant="outline" className="h-11 flex-1 px-4 sm:flex-none">
              <a href={`mailto:${clientEmail}`}>Écrire</a>
            </Button>
          )}
          <ClientMoreMenu
            clientId={client.id}
            clientName={clientName}
            hasEmail={!!clientEmail}
            profilType={client.profilType}
            intakeLink={latestIntake ? { token: latestIntake.token, target: latestIntake.target } : null}
            completionStatus={client.completionStatus}
            triggerClassName="h-11 gap-2 px-4"
          />
        </div>
      </div>

      {/* Bandeau d'état */}
      <div
        role="status"
        className={cn(
          "flex items-start gap-3 rounded-xl px-4 py-3.5",
          missingCount > 0 ? "bg-red-100 text-red-950" : "bg-green-100 text-green-950",
        )}
      >
        {missingCount > 0 ? <CircleAlert className="mt-0.5 size-5 shrink-0" /> : <CircleCheck className="mt-0.5 size-5 shrink-0" />}
        <p className="text-[14.5px] leading-relaxed">
          {missingCount > 0 ? (
            <>
              Il manque {missingCount > 1 ? `${missingCount} éléments` : "un élément"} pour envoyer le dossier au notaire :{" "}
              <strong className="font-semibold">{missingItems.join(", ").toLowerCase()}</strong>.{" "}
              {missingCount > 1
                ? "Saisissez-les ci-dessous si vous les avez obtenus, ou demandez-les au client."
                : "Saisissez-le ci-dessous si vous l'avez obtenu, ou demandez-le au client."}
            </>
          ) : (
            "Rien ne manque : toutes les informations et pièces obligatoires sont présentes."
          )}
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <ClientIdentityCard party={client} missing={missingData} />
          <ClientDocumentsCard party={client} clientDocuments={(client.documents || []).filter((doc: any) => !doc.personId && !doc.entrepriseId)} />
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <h2 className="text-base font-semibold">Dossiers</h2>
            {bails.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dossier.</p>
            ) : (
              bails.map((bail) => {
                const stage = getStage(bail.status);
                const owner = bail.parties.find((p) => p.profilType === "PROPRIETAIRE");
                const tenant = bail.parties.find((p) => p.profilType === "LOCATAIRE");
                const other = client.profilType === ProfilType.LOCATAIRE ? owner : tenant;
                const next = getNextAction({
                  status: bail.status,
                  hasTenant: !!tenant,
                  hasNotaire: bail.dossierAssignments.length > 0,
                  pendingNotaireRequests: bail.dossierAssignments.reduce((sum, a) => sum + a._count.requests, 0),
                });
                return (
                  <Link
                    key={bail.id}
                    href={`/interface/baux/${bail.id}`}
                    className="flex flex-col gap-1.5 rounded-xl border p-3 transition-colors hover:border-foreground/30"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <strong className="text-[14.5px] font-semibold leading-snug">{bail.property?.fullAddress || bail.property?.label || "Bien sans adresse"}</strong>
                      <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold", stage.className)}>{stage.label}</span>
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {BAIL_TYPE_LABELS[bail.bailType] || bail.bailType}
                      {" · "}
                      {client.profilType === ProfilType.LOCATAIRE ? "propriétaire" : "locataire"} : {partyName(other) || "à ajouter"}
                    </span>
                    <span>
                      <StateChip tone={bail.paidAt ? "ok" : "missing"} className="h-6">
                        {bail.paidAt ? `Frais payés le ${formatDate(bail.paidAt)}` : "Frais non payés"}
                      </StateChip>
                    </span>
                    {next.actor !== "personne" && <span className="text-[13px] font-semibold">Prochaine action : {next.label.toLowerCase()}</span>}
                  </Link>
                );
              })
            )}
          </section>

          {client.profilType === ProfilType.PROPRIETAIRE && (
            <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
              <h2 className="text-base font-semibold">Biens</h2>
              {properties.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun bien.</p>
              ) : (
                properties.map((property: any) => (
                  <Link key={property.id} href={`/interface/properties/${property.id}`} className="flex flex-col gap-0.5 text-[13.5px] hover:underline">
                    <strong className="text-[14.5px] font-semibold">{property.label || property.fullAddress || "Bien"}</strong>
                    <span className="text-muted-foreground">
                      {[property.fullAddress, PROPERTY_TYPE_LABELS[property.type] || property.type, property.surfaceM2 && `${Number(property.surfaceM2)} m²`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="text-muted-foreground">
                      {[LEGAL_STATUS_LABELS[property.legalStatus] || property.legalStatus, property.status === "LOUER" ? "loué" : "non loué"]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                ))
              )}
            </section>
          )}

          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <h2 className="text-base font-semibold">Formulaires et accès</h2>
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
              {intakesByTarget.length === 0 ? (
                <KV label="Formulaire">Aucun formulaire</KV>
              ) : (
                intakesByTarget.map((link) => (
                  <KV key={link.target} label={`Formulaire ${(INTAKE_TARGET_LABELS[link.target] || link.target).toLowerCase()}`}>
                    {intakeSummary(link)}
                  </KV>
                ))
              )}
              <KV label="Espace client">{accountCount > 0 ? "Compte actif" : "Pas encore de compte"}</KV>
            </dl>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <h2 className="text-base font-semibold">Détails</h2>
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
              <KV label="Créé le">
                {formatDateTime(client.createdAt)} · {client.createdBy ? `par ${client.createdBy.name || client.createdBy.email}` : "via le formulaire"}
              </KV>
              <KV label="Modifié le">
                {formatDateTime(client.updatedAt)}
                {client.updatedBy ? ` par ${client.updatedBy.name || client.updatedBy.email}` : ""}
              </KV>
              <KV label="Identifiant">
                <span className="break-all font-mono text-xs">{client.id}</span>
              </KV>
            </dl>
          </section>

          <section className="flex flex-col gap-2.5 rounded-xl border bg-card p-[18px]">
            <div>
              <h2 className="text-base font-semibold">Notes internes</h2>
              <p className="text-[12.5px] text-muted-foreground">Visibles par l&apos;équipe uniquement.</p>
            </div>
            <InternalNotes target="CLIENT" targetId={client.id} />
          </section>
        </aside>
      </div>

      {/* Vue détaillée existante des biens et de leurs baux */}
      {properties.length > 0 && <PropertyBailsViewer properties={properties} />}
    </div>
  );
}
