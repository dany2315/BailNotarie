import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";

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
    );
  }

  const isOwner = intakeLink.target === "OWNER";
  const clientName = intakeLink.client
    ? `${intakeLink.client.firstName || ""} ${intakeLink.client.lastName || ""}`.trim() || intakeLink.client.email
    : "Client";

  return (
    <div className="min-h-screen bg-background">
      {/* Header discret avec logo */}
      <header className="border-b border-border/40 pt-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center">
            <Image
              src="/logoLarge.png"
              alt="BailNotarie"
              width={120}
              height={36}
              className="h-20 w-auto opacity-80"
              priority
            />
          </div>
        </div>
      </header>

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
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                        <span>Vos informations ont été enregistrées avec succès.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                        <span>Les informations de votre bien immobilier ont été créées.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                        <span>Un bail a été créé avec les informations fournies.</span>
                      </li>
                      {intakeLink.bail && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                          <span>Un email a été envoyé au locataire pour qu'il remplisse son formulaire.</span>
                        </li>
                      )}
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                        <span>Vos informations ont été enregistrées avec succès.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                        <span>Vos documents ont été téléchargés et sont en cours de traitement.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                        <span>Votre dossier de location est maintenant complet.</span>
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
                <a href="mailto:contact@bailnotarie.fr" target="_blank">
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
    </div>
  );
}
