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
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const intakeLink = await getIntakeLinkByToken(resolvedParams.token);

  if (!intakeLink) {
    notFound();
  }

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
            <IntakePrimaryLink href={`/intakes/${intakeLink.token}/success`}>
              Voir la confirmation
              <ArrowRight className="h-4 w-4" />
            </IntakePrimaryLink>
          </IntakeActions>
        </div>
      </IntakeShell>
    );
  }

  const isOwner = intakeLink.target === "OWNER";
  const primaryPerson = intakeLink.client?.persons?.find((p: any) => p.isPrimary) || intakeLink.client?.persons?.[0];
  const clientName = intakeLink.client
    ? primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || (primaryPerson.email || "Client")
      : "Client"
    : "Client";

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
          <IntakePrimaryLink href={`/intakes/${intakeLink.token}`}>
            Reprendre le formulaire
            <ArrowRight className="h-4 w-4" />
          </IntakePrimaryLink>
        </IntakeActions>
      </div>
    </IntakeShell>
  );
}
