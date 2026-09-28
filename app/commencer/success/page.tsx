import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Download, Mail, Receipt, ShieldCheck } from "lucide-react";
import { MicroLabel, Surface } from "@/components/client-v2/owner-ui";
import {
  IntakeActions,
  IntakeHero,
  IntakeNote,
  IntakePrimaryLink,
  IntakeQuietLink,
  IntakeShell,
  IntakeSteps,
} from "@/components/intake/intake-state";
import { stripe } from "@/lib/stripe";

export default async function IntakeSuccessPage({
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
        </div>
      </IntakeShell>
    );
  }

  const isOwner = intakeLink.target === "OWNER";
  const clientSpaceUrl = isOwner ? "/client/proprietaire" : "/client/locataire";
  
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

  // Récupérer le reçu Stripe si disponible
  let receiptUrl: string | null = null;
  const paymentIntentId = (intakeLink as any).bail?.stripePaymentIntentId;
  if (isOwner && paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge = paymentIntent.latest_charge as any;
      receiptUrl = charge?.receipt_url ?? null;
    } catch {
      // On continue sans reçu si l'appel Stripe échoue
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
    <IntakeShell tone="success" width="wide">
      <div className="space-y-7">
        <IntakeHero
          tone="success"
          icon={CheckCircle2}
          kicker="Demande enregistrée"
          title="C'est envoyé"
          description={`Merci ${clientName}. Votre dossier est entre nos mains — vous n'avez plus rien à faire pour l'instant.`}
        />

        <IntakeSteps title="La suite" steps={nextSteps} />

        {/* Reçu de paiement */}
        {isOwner && (
          <Surface tone="raised" className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4 text-slate-400" />
                <MicroLabel>Reçu de paiement</MicroLabel>
              </div>
              {receiptUrl && (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </a>
              )}
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3.5">
              <span className="text-[13.5px] text-slate-600">Frais de dossier BailNotarie</span>
              <span className="text-[16px] font-bold tabular-nums tracking-tight text-slate-900">
                39,90 € TTC
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] tabular-nums text-slate-400">
              <span>Réf. {token.slice(0, 8).toUpperCase()}</span>
              <span>Paiement unique</span>
            </div>
            <p className="mt-3 text-[11.5px] leading-snug text-slate-400">
              Ces frais couvrent la constitution, vérification et transmission de votre dossier. Les
              émoluments du notaire seront facturés séparément.
            </p>
          </Surface>
        )}

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
