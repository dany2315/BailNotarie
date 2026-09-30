import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Mail, ShieldCheck } from "lucide-react";
import {
  IntakeActions,
  IntakeHero,
  IntakeNote,
  IntakePrimaryLink,
  IntakeQuietLink,
  IntakeShell,
  IntakeSteps,
} from "@/components/intake/intake-state";

export default async function IntakeSuccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const intakeLink = await getIntakeLinkByToken(resolvedParams.token);

  if (!intakeLink) {
    notFound();
  }

  // Vérifier que le formulaire a bien été soumis
  if (intakeLink.status !== "SUBMITTED") {
    return (
      <IntakeShell tone="progress">
        <div className="space-y-7">
          <IntakeHero
            tone="progress"
            icon={Clock}
            kicker="Formulaire non soumis"
            title="Ce formulaire n'a pas encore été soumis"
            description="Complétez-le jusqu'au bout pour accéder à cette page."
          />
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

  const isOwner = intakeLink.target === "OWNER";
  const clientSpaceUrl = isOwner ? "/client/proprietaire" : "/client/locataire";

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

  const nextSteps = isOwner
    ? [
        "Vos informations ont bien été enregistrées.",
        "Le locataire reçoit un lien pour compléter son formulaire.",
        "Notre équipe vérifie votre dossier et vos pièces.",
        "Un rendez-vous de signature avec notaire vous sera proposé.",
      ]
    : [
        "Vos informations ont bien été enregistrées.",
        "Notre équipe vérifie votre dossier et vos pièces.",
        "Un rendez-vous de signature avec notaire vous sera proposé.",
      ];

  return (
    <IntakeShell tone="success">
      <div className="space-y-7">
        <IntakeHero
          tone="success"
          icon={CheckCircle2}
          kicker="Demande enregistrée"
          title="C'est envoyé"
          description={`Merci ${clientName}. Votre dossier est entre nos mains — vous n'avez plus rien à faire pour l'instant.`}
        />

        <IntakeSteps title="La suite" steps={nextSteps} />

        <IntakeNote icon={ShieldCheck} tone="success">
          {isOwner
            ? "Un email de confirmation vous sera envoyé. En cas de pièce manquante, nous vous contacterons rapidement."
            : "Un email de confirmation vous sera envoyé. Le propriétaire est informé de l'avancement de votre dossier."}
        </IntakeNote>

        <IntakeActions>
          <IntakePrimaryLink href={clientSpaceUrl}>
            Accéder à mon espace client
            <ArrowRight className="h-4 w-4" />
          </IntakePrimaryLink>
          <IntakeQuietLink href="mailto:contact@bailnotarie.fr" external>
            <Mail className="h-4 w-4" />
            Contacter le support
          </IntakeQuietLink>
        </IntakeActions>
      </div>
    </IntakeShell>
  );
}
