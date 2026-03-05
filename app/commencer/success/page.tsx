import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
      <div className="min-h-screen bg-background">
      <Header />
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Formulaire non soumis</h1>
              <p className="text-muted-foreground">
                Ce formulaire n'a pas encore été soumis. Veuillez compléter le formulaire pour accéder à cette page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      <main className="min-h-[calc(100vh-80px)] px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden border-0 shadow-2xl py-0">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-5 text-white sm:px-10">
                <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h1 className="text-center text-2xl font-bold sm:text-3xl">
                  Votre demande a été enregistrée avec succès
                </h1>
                <p className="mt-3 text-center text-emerald-50">
                  Merci {clientName}. Votre dossier est bien pris en compte.
                </p>
              </div>

              <div className="space-y-6 p-6 sm:p-8">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-emerald-800">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-semibold">Confirmation envoyée</span>
                  </div>
                  <p className="text-sm text-emerald-700">
                    {isOwner
                      ? "Un email de confirmation vous sera envoyé. En cas de pièce manquante, nous vous contacterons rapidement."
                      : "Un email de confirmation vous sera envoyé. Le propriétaire est informé de l’avancement de votre dossier."}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">Prochaines étapes</h2>
                  <ul className="space-y-3">
                    {nextSteps.map((step, index) => (
                      <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {index + 1}
                        </div>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild size="lg" className="h-11 bg-green-600 hover:bg-green-700">
                    <a href={clientSpaceUrl} className="flex items-center justify-center gap-2">
                      Accéder à mon espace client
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-11">
                    <a href="mailto:contact@bailnotarie.fr" target="_blank" className="flex items-center justify-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contacter le support
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
