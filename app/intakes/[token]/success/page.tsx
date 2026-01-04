import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
  const primaryPerson = intakeLink.client?.persons?.find((p: any) => p.isPrimary) || intakeLink.client?.persons?.[0];
  const clientName = intakeLink.client
    ? primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || primaryPerson.email
      : "Client"
    : "Client";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="flex flex-row items-center justify-center gap-2 ">
                <div className="self-start rounded-full bg-green-100 dark:bg-green-900/20 p-2">
                  <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-start">Votre demande a été enregistrée avec succès</h2>
              </div>

            <div className="space-y-2">

              <p className="text-lg text-muted-foreground">
                Merci {clientName} pour votre confiance.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg px-6 py-2 space-y-4 text-left">
              <div>
                <h3 className="font-semibold mb-2">Ce qui se passe maintenant :</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {isOwner ? (
                    <>
                      <li className="flex flex-row items-center justify-start  gap-3">
                        <div className="self-start min-w-6 min-h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">1</div>
                        <span>Vos informations ont été enregistrées avec succès.</span>
                      </li>
                      <li className="flex flex-row items-center justify-start  gap-3">
                        <div className="self-start min-w-6 min-h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">2</div>
                        <span>Un email a été envoyé au locataire pour qu'il remplisse son formulaire.</span>
                      </li>
                      <li className="flex flex-row items-center justify-start  gap-3">
                        <div className="self-start min-w-6 min-h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">3</div>
                        <span>Nous procédons à la vérification de vos informations et des pièces transmises.En cas de document manquant, nous vous en informerons.</span>
                      </li>
                      <li className="flex flex-row items-center justify-start  gap-3">
                        <div className="self-start min-w-6 min-h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">4</div>
                        <span>Un rendez‑vous en visioconférence avec un notaire partenaire vous sera proposé pour la signature de votre acte authentique avec votre locataire</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex flex-row items-center justify-start  gap-3">
                        <div className="self-start min-w-6 min-h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">1</div>
                        <span>Vos informations ont été enregistrées avec succès.</span>
                      </li>
                      <li className="flex flex-row items-center justify-start  gap-3">
                        <div className="self-start min-w-6 min-h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">2</div>
                        <span>Nous procédons à la vérification de vos informations et des pièces transmises.En cas de document manquant, nous vous en informerons.</span>
                      </li>
                      <li className="flex flex-row items-center justify-start  gap-3">
                        <div className="self-start min-w-6 min-h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">3</div>
                        <span>Un rendez‑vous en visioconférence avec un notaire partenaire vous sera proposé pour la signature de votre acte authentique avec votre propriétaire</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                {isOwner
                  ? "Vous recevrez un email de confirmation sous peu. N'hésitez pas à nous contacter si vous avez des questions."
                  : "Vous recevrez un email de confirmation sous peu. Le propriétaire sera informé de la complétion de votre dossier."}
              </p>
            </div>

            <div className="flex flex-col gap-2">

              <Button asChild >
                <a href="mailto:contact@bailnotarie.fr" target="_blank" className="flex flex-row items-center justify-center  gap-2">
                  <Mail className="size-4" />
                  Contacter nous
                </a>  
              </Button>

              <Button asChild variant="outline" >
                <a href="/">
                  Retour à la page d'accueil
                </a>
              </Button>
            </div>
    
          </div>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
}
