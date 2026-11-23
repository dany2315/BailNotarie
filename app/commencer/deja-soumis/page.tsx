import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import {
  IntakeActions,
  IntakeHero,
  IntakeNote,
  IntakePrimaryLink,
  IntakeQuietLink,
  IntakeShell,
} from "@/components/intake/intake-state";

export default function DejaSoumisPage() {
  return (
    <IntakeShell tone="success">
      <div className="space-y-7">
        <IntakeHero
          tone="success"
          icon={CheckCircle2}
          kicker="Déjà soumis"
          title="Votre demande a déjà été soumise"
          description="Votre formulaire de bail notarié est en cours de traitement."
        />

        <IntakeNote icon={Mail} title="Prochaines étapes" tone="success">
          Notre équipe examine votre dossier et vous contactera prochainement.
        </IntakeNote>

        <IntakeActions>
          <IntakePrimaryLink href="/#contact">
            <Mail className="h-4 w-4" />
            Nous contacter
          </IntakePrimaryLink>
          <IntakeQuietLink href="/">
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </IntakeQuietLink>
        </IntakeActions>
      </div>
    </IntakeShell>
  );
}
