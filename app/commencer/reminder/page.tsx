import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { ArrowRight, BookmarkCheck, CheckCircle2, Mail } from "lucide-react";
import {
  IntakeActions,
  IntakeHero,
  IntakeNote,
  IntakePrimaryLink,
  IntakeQuietLink,
  IntakeShell,
  IntakeSteps,
} from "@/components/intake/intake-state";

export default async function IntakeReminderPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token;


  if (!token) {
    notFound();
  }
  
  const intakeLink = await getIntakeLinkByToken(token);

  if (!intakeLink) {
    notFound();
  }

  const isOwner = intakeLink.target === "OWNER";

  // Si le formulaire est déjà soumis, rediriger vers la page de succès
  if (intakeLink.status === "SUBMITTED") {
    return (
      <IntakeShell tone="success">
        <div className="space-y-7">
          <IntakeHero
            tone="success"
            icon={CheckCircle2}
            kicker="Déjà soumis"
            title="Ce formulaire est déjà envoyé"
            description="Rien à refaire — votre dossier suit son cours."
          />
          <IntakeActions>
            <IntakePrimaryLink href={isOwner ? "/client/proprietaire" : "/client/locataire"}>
              Accéder à mon espace client
              <ArrowRight className="h-4 w-4" />
            </IntakePrimaryLink>
            <IntakeQuietLink href={`/intakes/${intakeLink.token}/success`}>
              Voir la confirmation
            </IntakeQuietLink>
          </IntakeActions>
        </div>
      </IntakeShell>
    );
  }

  // Obtenir le nom du client depuis Person ou Entreprise
  let clientName = "Client";
  if (intakeLink.client) {
    const client = intakeLink.client;
    if (client.type === "PERSONNE_PHYSIQUE" && client.persons && client.persons.length > 0) {
      const primaryPerson = client.persons.find((p: any) => p.isPrimary) || client.persons[0];
      if (primaryPerson) {
        const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
        clientName = name || primaryPerson.email || "Client";
      }
    } else if (client.type === "PERSONNE_MORALE" && client.entreprise) {
      clientName = client.entreprise.legalName || client.entreprise.name || client.entreprise.email || "Client";
    }
  }

  return (
    <IntakeShell tone="progress">
      <div className="space-y-7">
        <IntakeHero
          tone="progress"
          icon={BookmarkCheck}
          kicker="Formulaire en cours"
          title="Vos données sont enregistrées"
          description={`Merci ${clientName}, rien n'est perdu. Il reste à terminer le formulaire pour que nous puissions traiter votre demande.`}
        />

        <IntakeSteps
          title="Ce qu'il reste à faire"
          steps={[
            "Complétez les champs qui manquent encore.",
            "Soumettez le formulaire à la dernière étape.",
            "Nous prenons alors votre dossier en charge.",
          ]}
        />

        <IntakeNote icon={Mail} title="Pour continuer plus tard">
          Reprenez le formulaire à tout moment avec le lien reçu par email. Vos données sont
          sauvegardées et conservées.
        </IntakeNote>

        <IntakeActions>
          <IntakePrimaryLink
            href={isOwner ? `/commencer/proprietaire/${intakeLink.token}` : `/intakes/${intakeLink.token}`}
          >
            Reprendre le formulaire
            <ArrowRight className="h-4 w-4" />
          </IntakePrimaryLink>
          <IntakeQuietLink href={isOwner ? "/client/proprietaire" : "/client/locataire"}>
            Mon espace client
          </IntakeQuietLink>
        </IntakeActions>
      </div>
    </IntakeShell>
  );
}
